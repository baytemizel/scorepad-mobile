import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useAuthStore } from '@/store/authStore';
import { setUserId, logEvent } from './analytics';
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
  await setUserId(user.uid);
  await logEvent('sign_up', { method: 'password' });
  return profile;
}

export async function signInWithApple(): Promise<UserProfile> {
  if (Platform.OS !== 'ios') throw new Error('Apple Sign In is iOS only');
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });
  if (!credential.identityToken) throw new Error('Apple Sign In failed: no token');
  const appleCredential = auth.AppleAuthProvider.credential(
    credential.identityToken,
  );
  const { user } = await auth().signInWithCredential(appleCredential);
  const profile = profileFromUser(user, useAuthStore.getState().isPremium);
  useAuthStore.getState().signInWithProfile(profile);
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
  await setUserId(user.uid);
  await logEvent('login', { method: 'facebook' });
  return profile;
}

export async function signInWithGoogle(): Promise<UserProfile> {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const result = await GoogleSignin.signIn();
  // GoogleSignin returns either { idToken, user } directly or wrapped in `data`
  // depending on SDK version; handle both shapes.
  const idToken: string | undefined =
    (result as { idToken?: string }).idToken ??
    (result as { data?: { idToken?: string } }).data?.idToken;
  if (!idToken) throw new Error('Google Sign In failed: no idToken');
  const credential = auth.GoogleAuthProvider.credential(idToken);
  const { user } = await auth().signInWithCredential(credential);
  const profile = profileFromUser(user, useAuthStore.getState().isPremium);
  useAuthStore.getState().signInWithProfile(profile);
  await setUserId(user.uid);
  await logEvent('login', { method: 'google' });
  return profile;
}

export async function signOut(): Promise<void> {
  try {
    await auth().signOut();
  } catch {
    // already signed out
  }
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
  useAuthStore.getState().signOut();
  await setUserId(null);
  await logEvent('sign_out');
}

export function subscribeToAuthChanges(
  cb: (user: FirebaseAuthTypes.User | null) => void,
): () => void {
  return auth().onAuthStateChanged(cb);
}
