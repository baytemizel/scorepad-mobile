import analytics from '@react-native-firebase/analytics';

/**
 * Thin Firebase Analytics wrapper. All calls are best-effort; errors are
 * silently swallowed so analytics never breaks the user-facing experience.
 */
export async function logEvent(
  name: string,
  params?: Record<string, unknown>,
): Promise<void> {
  try {
    await analytics().logEvent(name, params as Record<string, string | number> | undefined);
  } catch {
    // ignore
  }
}

export async function setUserId(uid: string | null): Promise<void> {
  try {
    await analytics().setUserId(uid);
  } catch {
    // ignore
  }
}

export async function setUserProperty(key: string, value: string | null): Promise<void> {
  try {
    await analytics().setUserProperty(key, value);
  } catch {
    // ignore
  }
}

export async function logScreenView(name: string): Promise<void> {
  try {
    await analytics().logScreenView({ screen_name: name, screen_class: name });
  } catch {
    // ignore
  }
}
