/**
 * IAP service — TEMPORARILY DISABLED.
 *
 * `expo-in-app-purchases` is deprecated and incompatible with Expo SDK 52 +
 * the new architecture (its old `ExportedModule` API was removed in
 * expo-modules-core 2.x). The package was removed to unblock the Android build.
 *
 * To re-enable in-app purchases, migrate to one of:
 *   - `react-native-iap` (most popular, well-maintained)
 *   - `expo-iap` (community Expo-flavored wrapper)
 *
 * This file preserves the original public surface so consumers in
 * `app/_layout.tsx`, `app/(main)/settings.tsx`, and `app/(main)/premium.tsx`
 * keep type-checking and don't crash at runtime — they just no-op.
 */
import { Platform } from 'react-native';

export const PREMIUM_PRODUCT_ID =
  process.env.IAP_PRODUCT_PREMIUM ?? 'com.oditteknoloji.scorepad.premium';

const DISABLED_WARNING =
  '[IAP] In-app purchases are disabled in this build. Migrate to react-native-iap or expo-iap to re-enable.';

export interface PremiumProductInfo {
  price: string;
  priceAmountMicros?: string;
  currency?: string;
  title?: string;
  description?: string;
}

export async function initializeIAP(): Promise<void> {
  if (__DEV__) console.warn(DISABLED_WARNING);
}

export async function fetchPremiumProduct(): Promise<PremiumProductInfo | null> {
  if (__DEV__) console.warn(DISABLED_WARNING);
  return null;
}

export async function purchasePremium(): Promise<boolean> {
  if (__DEV__) console.warn(DISABLED_WARNING);
  return false;
}

export async function restorePurchases(): Promise<boolean> {
  if (__DEV__) console.warn(DISABLED_WARNING);
  return false;
}

export async function disconnectIAP(): Promise<void> {
  // no-op
}

export const isIAPSupported = Platform.OS === 'ios' || Platform.OS === 'android';
