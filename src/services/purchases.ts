/**
 * In-app purchases via RevenueCat (`react-native-purchases`).
 *
 * Premium status is driven by a single RevenueCat *entitlement*
 * (`ENTITLEMENT_ID`). Whenever RevenueCat reports a change in entitlements —
 * after a purchase, a restore, a renewal, or on app launch — we mirror it into
 * the local auth store (`isPremium`) and the Firestore user document, so the
 * rest of the app (ad gating, cloud sync) keeps using `isPremium` exactly as
 * before. RevenueCat is the single source of truth for premium.
 *
 * Dashboard setup expected (app.revenuecat.com):
 *   - Entitlement identifier: `premium`
 *   - A "current" Offering with `monthly` + `annual` packages
 *   - iOS / Android public SDK keys provided via env (see app.config.ts `extra`)
 */
import { Platform, Linking } from 'react-native';
import Constants from 'expo-constants';
import Purchases, {
  LOG_LEVEL,
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
} from 'react-native-purchases';
import { useAuthStore } from '@/store/authStore';
import { setUserPremiumFlag } from './firestore';
import { logEvent } from './analytics';

/** RevenueCat entitlement that unlocks all premium features. */
export const ENTITLEMENT_ID = 'premium';

const extra = (Constants.expoConfig?.extra ?? {}) as {
  revenueCatIosKey?: string;
  revenueCatAndroidKey?: string;
};

const apiKey = Platform.select({
  ios: process.env.REVENUECAT_IOS_API_KEY ?? extra.revenueCatIosKey,
  android: process.env.REVENUECAT_ANDROID_API_KEY ?? extra.revenueCatAndroidKey,
});

let configured = false;
// If a sign-in is reported before the SDK finished configuring (boot race),
// we stash the uid here so `initializePurchases` can configure with it.
let pendingIdentifyUid: string | null = null;

export function isPurchasesConfigured(): boolean {
  return configured;
}

/** Result of a purchase attempt — distinguishes a user cancel from a failure. */
export interface PurchaseResult {
  success: boolean;
  cancelled: boolean;
}

/** Monthly + annual packages of the current offering, plus computed savings. */
export interface PremiumPackages {
  monthly: PurchasesPackage | null;
  annual: PurchasesPackage | null;
  /** Percent saved by buying annual vs. 12× monthly (null if not computable). */
  annualSavingsPercent: number | null;
}

function hasPremiumEntitlement(info: CustomerInfo): boolean {
  return info.entitlements.active[ENTITLEMENT_ID]?.isActive === true;
}

/**
 * Mirror RevenueCat's entitlement state into the local store + Firestore.
 * Only writes when the value actually changes to avoid redundant work. Used by
 * the background customerInfo listener and the internal refresh paths.
 */
function syncPremiumFromCustomerInfo(info: CustomerInfo): void {
  const active = hasPremiumEntitlement(info);
  if (useAuthStore.getState().isPremium === active) return;
  useAuthStore.getState().setPremium(active);
  void setUserPremiumFlag(active);
}

/**
 * Force-mirror entitlement state into the store + Firestore, bypassing the
 * "only on change" guard. Call this from the native paywall callbacks
 * (`onPurchaseCompleted` / `onRestoreCompleted`), which hand us an authoritative
 * `customerInfo`: we must propagate it ourselves rather than relying solely on
 * the background `addCustomerInfoUpdateListener`, which isn't reliably delivered
 * for the embedded `<RevenueCatUI.Paywall>` flow.
 */
export function forceSyncPremiumFromCustomerInfo(info: CustomerInfo): void {
  const active = hasPremiumEntitlement(info);
  useAuthStore.getState().setPremium(active);
  void setUserPremiumFlag(active);
}

/**
 * Re-pull customerInfo from RevenueCat and mirror it. Used as a fallback when a
 * purchase resolves (or throws) without the entitlement reflected yet, so a user
 * who was actually charged isn't shown a false "purchase failed". Returns whether
 * premium is active after the refresh.
 */
export async function refreshPremiumStatus(): Promise<boolean> {
  if (!configured) return false;
  try {
    const info = await Purchases.getCustomerInfo();
    syncPremiumFromCustomerInfo(info);
    return hasPremiumEntitlement(info);
  } catch (e) {
    if (__DEV__) console.warn('[RevenueCat] refreshPremiumStatus failed', e);
    return false;
  }
}

/**
 * Configure the RevenueCat SDK and start mirroring entitlement changes.
 * Safe to call multiple times — only the first call configures. No-ops (with a
 * dev warning) when no API key is present, so the app still boots locally.
 */
export async function initializePurchases(): Promise<void> {
  if (configured) return;
  if (!apiKey) {
    if (__DEV__) {
      console.warn(
        '[RevenueCat] No API key configured (REVENUECAT_IOS_API_KEY / ' +
          'REVENUECAT_ANDROID_API_KEY). In-app purchases are disabled.',
      );
    }
    return;
  }
  // A placeholder key (the unfilled .env default) is non-empty, so the guard
  // above doesn't catch it — but configuring with it makes every SDK call fail
  // silently. Treat it as "not configured" so we don't pretend purchases work.
  if (apiKey.includes('REPLACE')) {
    if (__DEV__) {
      console.warn(
        `[RevenueCat] Placeholder API key for ${Platform.OS} ("${apiKey}"). ` +
          'Fill in the real public SDK key in .env — purchases are disabled.',
      );
    }
    return;
  }

  if (__DEV__) void Purchases.setLogLevel(LOG_LEVEL.DEBUG);

  // Link RevenueCat to the Firebase uid when a session is already restored, so
  // purchases follow the account across devices. Falls back to a uid reported by
  // the auth listener before configuration finished, then anonymous.
  const uid =
    useAuthStore.getState().user?.uid ?? pendingIdentifyUid ?? null;
  Purchases.configure({ apiKey, appUserID: uid });
  configured = true;
  pendingIdentifyUid = null;

  Purchases.addCustomerInfoUpdateListener(syncPremiumFromCustomerInfo);

  try {
    syncPremiumFromCustomerInfo(await Purchases.getCustomerInfo());
  } catch (e) {
    if (__DEV__) console.warn('[RevenueCat] initial getCustomerInfo failed', e);
  }
}

/**
 * Alias the current RevenueCat user to a signed-in Firebase uid. Call right
 * after a successful sign-in so entitlements are tied to the real account.
 */
export async function identifyPurchaseUser(uid: string): Promise<void> {
  if (!configured) {
    // Called before the SDK finished configuring (boot race). Remember the uid
    // so `initializePurchases` configures with it instead of going anonymous.
    pendingIdentifyUid = uid;
    return;
  }
  try {
    const { customerInfo } = await Purchases.logIn(uid);
    syncPremiumFromCustomerInfo(customerInfo);
  } catch (e) {
    if (__DEV__) console.warn('[RevenueCat] logIn failed', e);
  }
}

/** Reset RevenueCat to an anonymous user on sign-out. */
export async function resetPurchaseUser(): Promise<void> {
  if (!configured) return;
  try {
    await Purchases.logOut();
  } catch (e) {
    if (__DEV__) console.warn('[RevenueCat] logOut failed', e);
  }
}

/** The current offering configured in the RevenueCat dashboard, or null. */
export async function fetchCurrentOffering(): Promise<PurchasesOffering | null> {
  if (!configured) return null;
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch (e) {
    if (__DEV__) console.warn('[RevenueCat] getOfferings failed', e);
    return null;
  }
}

/** Pull monthly/annual packages out of an offering and compute annual savings. */
export function getPremiumPackages(
  offering: PurchasesOffering | null,
): PremiumPackages {
  const monthly = offering?.monthly ?? null;
  const annual = offering?.annual ?? null;

  let annualSavingsPercent: number | null = null;
  const monthlyPrice = monthly?.product.price;
  const annualPrice = annual?.product.price;
  if (monthlyPrice && annualPrice && monthlyPrice > 0) {
    const yearAtMonthly = monthlyPrice * 12;
    const saved = Math.round((1 - annualPrice / yearAtMonthly) * 100);
    if (saved > 0) annualSavingsPercent = saved;
  }

  return { monthly, annual, annualSavingsPercent };
}

/**
 * Purchase a package. Returns whether premium is now active and whether the
 * user cancelled (so callers can stay quiet on cancel and only alert on real
 * failures). Throws nothing — failures resolve to { success: false }.
 */
export async function purchasePackage(
  pkg: PurchasesPackage,
): Promise<PurchaseResult> {
  if (!configured) return { success: false, cancelled: false };
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    // The store transaction completed. Usually the entitlement is already in the
    // returned snapshot; when it isn't yet (backend eventual consistency), re-pull
    // once before deciding, so a charged user isn't told the purchase failed.
    const success =
      hasPremiumEntitlement(customerInfo) ||
      (await refreshPremiumStatus());
    if (hasPremiumEntitlement(customerInfo)) {
      syncPremiumFromCustomerInfo(customerInfo);
    }
    if (success) {
      void logEvent('premium_purchased', {
        package: pkg.identifier,
        product: pkg.product.identifier,
        price: pkg.product.price,
        currency: pkg.product.currencyCode,
      });
    }
    return { success, cancelled: false };
  } catch (e) {
    const cancelled = (e as { userCancelled?: boolean }).userCancelled === true;
    if (cancelled) return { success: false, cancelled: true };
    if (__DEV__) console.warn('[RevenueCat] purchase failed', e);
    // A non-cancel error doesn't guarantee no charge — the store may have
    // completed the transaction while finishing it threw (network blip,
    // receipt-already-in-use). Re-check entitlements before reporting failure.
    const success = await refreshPremiumStatus();
    return { success, cancelled: false };
  }
}

/** Restore previous purchases. Returns whether premium is active afterwards. */
export async function restorePurchases(): Promise<boolean> {
  if (!configured) return false;
  try {
    const info = await Purchases.restorePurchases();
    syncPremiumFromCustomerInfo(info);
    return hasPremiumEntitlement(info);
  } catch (e) {
    if (__DEV__) console.warn('[RevenueCat] restore failed', e);
    return false;
  }
}

/**
 * Open the platform's subscription-management screen. Uses the RevenueCat
 * `managementURL` when available, falling back to the store's generic page.
 * Returns false when nothing could be opened.
 */
export async function openManageSubscriptions(): Promise<boolean> {
  let url: string | null = null;
  if (configured) {
    try {
      url = (await Purchases.getCustomerInfo()).managementURL;
    } catch {
      // fall through to platform default
    }
  }
  if (!url) {
    url =
      Platform.OS === 'ios'
        ? 'https://apps.apple.com/account/subscriptions'
        : 'https://play.google.com/store/account/subscriptions';
  }
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}
