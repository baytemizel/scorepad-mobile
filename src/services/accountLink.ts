import { Alert, Platform } from 'react-native';
import i18n from '@/localization/i18n';
import { facebookEnabled, SocialProvider } from './auth';

const providerNames: Record<SocialProvider, string> = {
  google: 'Google',
  apple: 'Apple',
  facebook: 'Facebook',
};

/**
 * After `refused` hit an email that already has an account, ask which
 * provider that account uses. Resolves with the choice, or null when the
 * person backs out. At most two providers are offered next to Cancel, which
 * fits Android's three-button alert.
 */
export function promptLinkProvider(
  refused: SocialProvider,
): Promise<SocialProvider | null> {
  const options = (['google', 'apple', 'facebook'] as const).filter(
    (p) =>
      p !== refused &&
      (p !== 'apple' || Platform.OS === 'ios') &&
      (p !== 'facebook' || facebookEnabled),
  );
  return new Promise((resolve) => {
    Alert.alert(
      i18n.t('auth.link.title'),
      i18n.t('auth.link.message', { provider: providerNames[refused] }),
      [
        ...options.map((p) => ({
          text: providerNames[p],
          onPress: () => resolve(p),
        })),
        { text: i18n.t('common.cancel'), style: 'cancel', onPress: () => resolve(null) },
      ],
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });
}
