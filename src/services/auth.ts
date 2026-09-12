import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import {
  GoogleSignin,
  isCancelledResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { useAuthStore } from '@/store/authStore';
import { useMatchHistoryStore } from '@/store/matchHistoryStore';
import { setUserId, logEvent } from './analytics';
import { identifyPurchaseUser, resetPurchaseUser } from './purchases';
import { deleteUserDataFromCloud, fetchMatchesFromCloud } from './firestore';
import { UserProfile } from '@/types';

const facebookEnabled = Constants.expoConfig?.extra?.facebookEnabled === true;

// Load the Facebook SDK lazily and only when enabled. Importing it eagerly
// instantiates native modules whose constructors throw FacebookSdkNotInitialized
// when no app ID is configured — on the New Architecture that surfaces as an
// uncatchable JNI abort that crashes the app before the splash screen.
type FBSDKModule = typeof import('react-native-fbsdk-next');
function getFBSDK(): FBSDKModule {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('react-native-fbsdk-next');
}

const profileFromUser = (
  user: FirebaseAuthTypes.User,
  isPremium = false,
): UserProfile => ({
  uid: user.uid,
  email: user.email ?? undefined,
  displayName: user.displayName ?? undefined,
  isPremium,
  createdAt: user.metadata?.creationTime
    ? new Date(user.metadata.creationTime).getTime()
    : Date.now(),
});

/**
 * Pull the signed-in user's matches from the cloud into the local history
 * store so their data follows them across devices / reinstalls. Fire-and-forget
 * after a successful sign-in. A transient failure returns [] and we keep the
 * local cache untouched rather than wiping it.
 */
async function hydrateUserData(): Promise<void> {
  try {
    const records = await fetchMatchesFromCloud();
    if (records.length) {
      useMatchHistoryStore.setState({ records });
    }
  } catch {
    // ignore — local cache stays as-is
  }
}

/** The `code` a Firebase or provider SDK error carries, or '' when it has none. */
export function authErrorCode(e: unknown): string {
  const code = (e as { code?: unknown } | null)?.code;
  return typeof code === 'string' ? code : '';
}

/**
 * True when the user closed a provider's own sign-in sheet. That's a choice,
 * not a failure, so screens stay quiet instead of showing an error.
 */
export function isAuthCancelled(e: unknown): boolean {
  const code = authErrorCode(e);
  if (code === 'ERR_REQUEST_CANCELED' || code === statusCodes.SIGN_IN_CANCELLED) {
    return true;
  }
  return e instanceof Error && /cancelled/i.test(e.message);
}

/**
 * Translation key for a failed Google/Apple/Facebook sign-in, or null when the
 * user just dismissed the sheet and there is nothing to report.
 */
export function socialSignInErrorKey(e: unknown): string | null {
  if (isAuthCancelled(e)) return null;
  // Firebase keeps one account per email: this address already signed up with
  // another provider (or a password), and Firebase won't merge the two.
  if (authErrorCode(e) === 'auth/account-exists-with-different-credential') {
    return 'auth.errors.accountExistsOtherMethod';
  }
  return 'auth.errors.generic';
}

export function configureGoogleSignIn(webClientId: string | undefined): void {
  if (!webClientId) {
    if (__DEV__) {
      console.warn(
        '[Auth] FIREBASE_GOOGLE_WEB_CLIENT_ID not set — Google Sign-In is disabled.',
      );
    }
    return;
  }
  GoogleSignin.configure({ webClientId });
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<UserProfile> {
  const { user } = await auth().signInWithEmailAndPassword(email, password);
  const profile = profileFromUser(user, useAuthStore.getState().isPremium);
  useAuthStore.getState().signInWithProfile(profile);
  // Restore this account's match history from the cloud (free + premium).
  void hydrateUserData();
  // Tie RevenueCat entitlements to this account so premium follows the user
  // across devices and reinstalls.
  void identifyPurchaseUser(profile.uid);
  await setUserId(user.uid);
  await logEvent('login', { method: 'password' });
  return profile;
}

export async function signUpWithEmail(
  email: string,
  password: string,
): Promise<UserProfile> {
  const { user } = await auth().createUserWithEmailAndPassword(email, password);
  const profile = profileFromUser(user, false);
  useAuthStore.getState().signInWithProfile(profile);
  // Restore this account's match history from the cloud (free + premium).
  void hydrateUserData();
  // Tie RevenueCat entitlements to this account so premium follows the user
  // across devices and reinstalls.
  void identifyPurchaseUser(profile.uid);
  await setUserId(user.uid);
  await logEvent('sign_up', { method: 'password' });
  return profile;
}

/** Sign in with Apple is offered on iOS only, where the OS supports it. */
export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

/**
 * Show Apple's sign-in sheet and turn the result into a Firebase credential.
 *
 * Firebase requires a fresh nonce per request: Apple receives its SHA-256
 * hash and embeds it in the identity token, Firebase receives the raw value
 * and checks that the two match, so a captured token can't be replayed.
 * The authorization code is only needed to revoke Apple's token when the
 * account is deleted.
 */
async function requestAppleCredential(): Promise<{
  credential: FirebaseAuthTypes.AuthCredential;
  authorizationCode: string | null;
}> {
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce,
  );
  const result = await AppleAuthentication.signInAsync({
    // Email only: the app never shows a name, so it doesn't ask for one.
    requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL],
    nonce: hashedNonce,
  });
  if (!result.identityToken) throw new Error('Apple Sign In failed: no token');
  return {
    credential: auth.AppleAuthProvider.credential(result.identityToken, rawNonce),
    authorizationCode: result.authorizationCode,
  };
}

export async function signInWithApple(): Promise<UserProfile> {
  if (Platform.OS !== 'ios') throw new Error('Apple Sign In is iOS only');
  const { credential } = await requestAppleCredential();
  const { user } = await auth().signInWithCredential(credential);
  const profile = profileFromUser(user, useAuthStore.getState().isPremium);
  useAuthStore.getState().signInWithProfile(profile);
  // Restore this account's match history from the cloud (free + premium).
  void hydrateUserData();
  // Tie RevenueCat entitlements to this account so premium follows the user
  // across devices and reinstalls.
  void identifyPurchaseUser(profile.uid);
  await setUserId(user.uid);
  await logEvent('login', { method: 'apple' });
  return profile;
}

export function configureFacebookSignIn(appId?: string, clientToken?: string): void {
  if (!facebookEnabled || !appId || !clientToken) return;
  const { Settings } = getFBSDK();
  Settings.setAppID(appId);
  Settings.setClientToken(clientToken);
  Settings.initializeSDK();
}

export async function signInWithFacebook(): Promise<UserProfile> {
  const { LoginManager, AccessToken } = getFBSDK();
  const result = await LoginManager.logInWithPermissions([
    'public_profile',
    'email',
  ]);
  if (result.isCancelled) {
    throw new Error('Facebook Sign In cancelled');
  }
  const tokenData = await AccessToken.getCurrentAccessToken();
  if (!tokenData?.accessToken) {
    throw new Error('Facebook Sign In failed: no access token');
  }
  const credential = auth.FacebookAuthProvider.credential(
    tokenData.accessToken,
  );
  const { user } = await auth().signInWithCredential(credential);
  const profile = profileFromUser(user, useAuthStore.getState().isPremium);
  useAuthStore.getState().signInWithProfile(profile);
  // Restore this account's match history from the cloud (free + premium).
  void hydrateUserData();
  // Tie RevenueCat entitlements to this account so premium follows the user
  // across devices and reinstalls.
  void identifyPurchaseUser(profile.uid);
  await setUserId(user.uid);
  await logEvent('login', { method: 'facebook' });
  return profile;
}

/**
 * GoogleSignin returns either { idToken, user } directly or wrapped in `data`
 * depending on SDK version; handle both shapes.
 */
function googleIdTokenFrom(result: unknown): string | undefined {
  if (!result || typeof result !== 'object') return undefined;
  return (
    (result as { idToken?: string }).idToken ??
    (result as { data?: { idToken?: string } | null }).data?.idToken
  );
}

/**
 * Get a Google ID token for Firebase. With `silent`, the saved Google session
 * is tried first so re-authentication doesn't show Google's sheet again.
 */
async function requestGoogleIdToken({ silent = false } = {}): Promise<string> {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  if (silent) {
    const restored = await GoogleSignin.signInSilently().catch(() => null);
    const restoredToken = googleIdTokenFrom(restored);
    if (restoredToken) return restoredToken;
  }
  const result = await GoogleSignin.signIn();
  // Since SDK v13 closing the sheet resolves instead of rejecting.
  if (isCancelledResponse(result)) throw new Error('Google Sign In cancelled');
  const idToken = googleIdTokenFrom(result);
  if (!idToken) throw new Error('Google Sign In failed: no idToken');
  return idToken;
}

export async function signInWithGoogle(): Promise<UserProfile> {
  const idToken = await requestGoogleIdToken();
  const credential = auth.GoogleAuthProvider.credential(idToken);
  const { user } = await auth().signInWithCredential(credential);
  const profile = profileFromUser(user, useAuthStore.getState().isPremium);
  useAuthStore.getState().signInWithProfile(profile);
  // Restore this account's match history from the cloud (free + premium).
  void hydrateUserData();
  // Tie RevenueCat entitlements to this account so premium follows the user
  // across devices and reinstalls.
  void identifyPurchaseUser(profile.uid);
  await setUserId(user.uid);
  await logEvent('login', { method: 'google' });
  return profile;
}

/**
 * Drop every local trace of the session: provider SDK sessions, the auth
 * store, RevenueCat's alias and the analytics user id. Shared by sign-out and
 * account deletion.
 */
async function resetLocalSession(): Promise<void> {
  try {
    await GoogleSignin.signOut();
  } catch {
    // ignore
  }
  if (facebookEnabled) {
    try {
      getFBSDK().LoginManager.logOut();
    } catch {
      // ignore
    }
  }
  // Also clears the local match cache (see authStore.signOut).
  useAuthStore.getState().signOut();
  void resetPurchaseUser();
  await setUserId(null);
}

export async function signOut(): Promise<void> {
  try {
    await auth().signOut();
  } catch {
    // already signed out
  }
  await resetLocalSession();
  await logEvent('sign_out');
}

export type SignInProvider = 'apple.com' | 'google.com' | 'password' | 'other';

/**
 * How the signed-in Firebase user authenticates, which decides how account
 * deletion re-authenticates. Apple wins when several are linked, because its
 * token must be revoked on deletion.
 */
export function currentSignInProvider(): SignInProvider | null {
  const user = auth().currentUser;
  if (!user) return null;
  const ids = user.providerData.map((p) => p.providerId);
  if (ids.includes('apple.com')) return 'apple.com';
  if (ids.includes('google.com')) return 'google.com';
  if (ids.includes('password')) return 'password';
  return 'other';
}

/**
 * Permanently delete the signed-in account and its cloud data, as App Store
 * guideline 5.1.1(v) requires of apps that let people create accounts.
 *
 * Firebase only deletes an account that signed in recently, so the user
 * re-authenticates with the same provider first: Apple and Google through
 * their own sheets, password accounts by passing `password`. Apple's fresh
 * sign-in also yields the one-time authorization code used to revoke the
 * app's Apple token, which Apple expects on deletion.
 */
export async function deleteAccount(password?: string): Promise<void> {
  const user = auth().currentUser;
  if (!user) throw new Error('No signed-in user to delete');
  const provider = currentSignInProvider();

  let appleAuthorizationCode: string | null = null;
  if (provider === 'apple.com' && Platform.OS === 'ios') {
    const apple = await requestAppleCredential();
    await user.reauthenticateWithCredential(apple.credential);
    appleAuthorizationCode = apple.authorizationCode;
  } else if (provider === 'google.com') {
    const idToken = await requestGoogleIdToken({ silent: true });
    await user.reauthenticateWithCredential(
      auth.GoogleAuthProvider.credential(idToken),
    );
  } else if (provider === 'password' && user.email && password) {
    await user.reauthenticateWithCredential(
      auth.EmailAuthProvider.credential(user.email, password),
    );
  }
  // Anything else goes straight to delete(), which rejects with
  // auth/requires-recent-login if the session is too old.

  // Cloud data goes first, while requests are still authenticated: the
  // security rules reject them once the user is gone. If this fails the
  // account is left intact, so the user can simply try again.
  await deleteUserDataFromCloud(user.uid);

  if (appleAuthorizationCode) {
    try {
      await auth().revokeToken(appleAuthorizationCode);
    } catch (e) {
      // Needs the Services ID and key in Firebase's Apple provider settings.
      // Don't block the deletion the user asked for on it.
      console.warn('[Auth] Apple token revocation failed', e);
    }
  }
  if (provider === 'google.com') {
    try {
      await GoogleSignin.revokeAccess();
    } catch {
      // ignore
    }
  }

  await user.delete();
  await resetLocalSession();
  await logEvent('delete_account');
}

export function subscribeToAuthChanges(
  cb: (user: FirebaseAuthTypes.User | null) => void,
): () => void {
  return auth().onAuthStateChanged(cb);
}
