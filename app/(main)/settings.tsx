import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Pressable,
  Alert,
  Linking,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Constants from 'expo-constants';
import { useTheme } from '@/theme/ThemeProvider';
import { useThemeControls } from '@/theme/ThemeProvider';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useSettingsStore } from '@/store/settingsStore';
import { useAuthStore } from '@/store/authStore';
import {
  signOut,
  deleteAccount,
  currentSignInProvider,
  authErrorCode,
  isAuthCancelled,
} from '@/services/auth';
import { restorePurchases, openManageSubscriptions } from '@/services/purchases';
import { supportedLanguages, changeLanguage } from '@/localization/i18n';

export default function Settings() {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const { preference: themeMode, setMode: setThemeMode } = useThemeControls();
  const language = useSettingsStore((s) => s.language);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const setSoundEnabled = useSettingsStore((s) => s.setSoundEnabled);
  const hapticsEnabled = useSettingsStore((s) => s.hapticsEnabled);
  const setHapticsEnabled = useSettingsStore((s) => s.setHapticsEnabled);
  const user = useAuthStore((s) => s.user);
  const isPremium = useAuthStore((s) => s.isPremium);

  const [langModal, setLangModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [passwordModal, setPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const onSignOut = () => {
    Alert.alert(t('settings.signOut'), '', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.signOut'),
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/sign-in');
        },
      },
    ]);
  };

  const runDeleteAccount = async (accountPassword?: string) => {
    setDeleting(true);
    try {
      await deleteAccount(accountPassword);
      setPasswordModal(false);
      Alert.alert(t('settings.deleteAccountDone'));
      router.replace('/(auth)/sign-in');
    } catch (e) {
      if (isAuthCancelled(e)) return; // closed the provider's sheet
      const code = authErrorCode(e);
      if (
        accountPassword !== undefined &&
        /wrong-password|invalid-(login-)?credential/.test(code)
      ) {
        // Keep the sheet open so the password can be retyped.
        setPasswordError(t('auth.errors.wrongPassword'));
        return;
      }
      console.error('[DeleteAccount] error:', e);
      setPasswordModal(false);
      Alert.alert(
        t(
          code === 'auth/requires-recent-login'
            ? 'settings.deleteAccountReauth'
            : 'auth.errors.generic',
        ),
      );
    } finally {
      setDeleting(false);
    }
  };

  // Apple, Google and Facebook re-authenticate through their own sheets inside
  // deleteAccount; a password account confirms its password here first.
  const onDeleteAccount = () => {
    Alert.alert(t('settings.deleteAccountTitle'), t('settings.deleteAccountBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.deleteAccount'),
        style: 'destructive',
        onPress: () => {
          if (currentSignInProvider() === 'password') {
            setPassword('');
            setPasswordError(null);
            setPasswordModal(true);
          } else {
            void runDeleteAccount();
          }
        },
      },
    ]);
  };

  const onRestore = async () => {
    setBusy(true);
    try {
      const ok = await restorePurchases();
      Alert.alert(ok ? t('premium.restoreSuccess') : t('premium.restoreFailed'));
    } finally {
      setBusy(false);
    }
  };

  const onManageSubscription = () => {
    void openManageSubscriptions();
  };

  const activeLangCode = language ?? i18n.language;
  const currentLang =
    supportedLanguages.find((l) => l.code === activeLangCode)?.label ??
    activeLangCode?.toUpperCase() ??
    '';

  const version = Constants.expoConfig?.version ?? '1.0.0';
  const isAuthed = !!user;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }} edges={['top', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ width: 44 }}>
          <Text style={{ color: theme.colors.text, fontSize: 24 }}>‹</Text>
        </Pressable>
        <Text
          style={{
            color: theme.colors.text,
            fontSize: 18,
            fontWeight: '700',
            fontFamily: theme.fonts.heading.bold,
            flex: 1,
            textAlign: 'center',
          }}
        >
          {t('settings.title')}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        {/* Auth — Sign in / Sign out */}
        <View style={{ gap: 12 }}>
          {isAuthed && user?.email && (
            <Text
              numberOfLines={1}
              style={{
                color: theme.colors.textMuted,
                fontSize: 13,
                textAlign: 'center',
              }}
            >
              {user.email}
            </Text>
          )}
          {isAuthed ? (
            <>
              <Button
                label={t('settings.signOut')}
                variant="danger"
                onPress={onSignOut}
                disabled={deleting}
                fullWidth
              />
              <Pressable
                onPress={onDeleteAccount}
                disabled={deleting}
                hitSlop={8}
                style={styles.deleteAccountRow}
              >
                {deleting ? (
                  <ActivityIndicator color={theme.colors.danger} />
                ) : (
                  <Text
                    style={{
                      color: theme.colors.danger,
                      fontSize: 14,
                      fontWeight: '600',
                    }}
                  >
                    {t('settings.deleteAccount')}
                  </Text>
                )}
              </Pressable>
            </>
          ) : (
            <Button
              label={t('auth.signIn')}
              variant="primary"
              onPress={() => router.push('/(auth)/sign-in')}
              fullWidth
            />
          )}
        </View>
        <View
          style={[styles.fullDivider, { backgroundColor: theme.colors.border }]}
        />

        {/* Language */}
        <Section title={t('settings.language')}>
          <Pressable onPress={() => setLangModal(true)}>
            <Card padded={false}>
              <View style={styles.languageRow}>
                <Text style={{ color: theme.colors.text, fontSize: 16, flex: 1 }}>
                  {currentLang}
                </Text>
                <Text style={{ color: theme.colors.textMuted, fontSize: 22 }}>›</Text>
              </View>
            </Card>
          </Pressable>
        </Section>

        {/* Theme */}
        <Section title={t('settings.theme')}>
          <Card>
            {(['light', 'dark', 'system'] as const).map((m, i, arr) => (
              <React.Fragment key={m}>
                <Pressable
                  onPress={() => setThemeMode(m)}
                  style={styles.themeRow}
                >
                  <Text
                    style={{
                      color: theme.colors.text,
                      fontSize: 16,
                      flex: 1,
                    }}
                  >
                    {t(`settings.theme${m === 'light' ? 'Light' : m === 'dark' ? 'Dark' : 'System'}`)}
                  </Text>
                  {themeMode === m && (
                    <Text style={{ color: theme.colors.primary, fontSize: 18 }}>✓</Text>
                  )}
                </Pressable>
                {i < arr.length - 1 && (
                  <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />
                )}
              </React.Fragment>
            ))}
          </Card>
        </Section>

        {/* Feedback */}
        <Section title={t('common.continue')}>
          <Card>
            <View style={styles.row}>
              <Text style={{ color: theme.colors.text, fontSize: 16, flex: 1 }}>
                {t('settings.sound')}
              </Text>
              <Switch value={soundEnabled} onValueChange={setSoundEnabled} />
            </View>
            <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />
            <View style={styles.row}>
              <Text style={{ color: theme.colors.text, fontSize: 16, flex: 1 }}>
                {t('settings.haptics')}
              </Text>
              <Switch value={hapticsEnabled} onValueChange={setHapticsEnabled} />
            </View>
          </Card>
        </Section>

        {/* Premium */}
        <Section title={t('settings.premium')}>
          <Card>
            {isPremium ? (
              <>
                <Pressable onPress={onManageSubscription} style={styles.row}>
                  <Text style={{ color: theme.colors.text, fontSize: 16, flex: 1 }}>
                    {t('settings.manageSubscription')}
                  </Text>
                  <Text style={{ color: theme.colors.textMuted, fontSize: 22 }}>›</Text>
                </Pressable>
                <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />
              </>
            ) : (
              <>
                <Pressable
                  onPress={() => router.push('/(main)/premium')}
                  style={styles.row}
                >
                  <Text style={{ color: theme.colors.text, fontSize: 16, flex: 1 }}>
                    ⭐ {t('home.premiumCta')}
                  </Text>
                  <Text style={{ color: theme.colors.textMuted, fontSize: 22 }}>›</Text>
                </Pressable>
                <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />
              </>
            )}
            <Pressable onPress={onRestore} disabled={busy} style={styles.row}>
              <Text style={{ color: theme.colors.text, fontSize: 16, flex: 1 }}>
                {t('settings.restorePurchases')}
              </Text>
            </Pressable>
          </Card>
        </Section>

        {/* Support */}
        <Section title={t('settings.support')}>
          <Card>
            <Pressable
              onPress={() => Linking.openURL('mailto:support@scorepad.best')}
              style={styles.row}
            >
              <Text style={{ color: theme.colors.text, fontSize: 16, flex: 1 }}>
                {t('settings.contact')}
              </Text>
              <Text style={{ color: theme.colors.textMuted, fontSize: 22 }}>›</Text>
            </Pressable>
            <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />
            <Pressable
              onPress={() => router.push('/settings/privacy')}
              style={styles.row}
            >
              <Text style={{ color: theme.colors.text, fontSize: 16, flex: 1 }}>
                {t('settings.privacy')}
              </Text>
              <Text style={{ color: theme.colors.textMuted, fontSize: 22 }}>›</Text>
            </Pressable>
            <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />
            <Pressable
              onPress={() => router.push('/settings/terms')}
              style={styles.row}
            >
              <Text style={{ color: theme.colors.text, fontSize: 16, flex: 1 }}>
                {t('settings.terms')}
              </Text>
              <Text style={{ color: theme.colors.textMuted, fontSize: 22 }}>›</Text>
            </Pressable>
          </Card>
        </Section>

        <Text
          style={{
            color: theme.colors.textMuted,
            fontSize: 12,
            textAlign: 'center',
            marginTop: 8,
          }}
        >
          {t('settings.version', { version })}
        </Text>
      </ScrollView>

      <Modal
        visible={langModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setLangModal(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }}>
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <View style={{ width: 80 }} />
            <Text
              style={{
                color: theme.colors.text,
                fontSize: 18,
                fontWeight: '700',
                flex: 1,
                textAlign: 'center',
              }}
            >
              {t('settings.language')}
            </Text>
            <Pressable onPress={() => setLangModal(false)} hitSlop={12} style={{ width: 80, alignItems: 'flex-end', paddingRight: 16 }}>
              <Text style={{ color: theme.colors.primary, fontSize: 16, fontWeight: '600' }}>
                {t('common.done')}
              </Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            {supportedLanguages.map((l) => {
              const isSelected = language === l.code;
              return (
                <Pressable
                  key={l.code}
                  onPress={async () => {
                    await changeLanguage(l.code);
                    setLanguage(l.code);
                  }}
                  style={[
                    styles.langRow,
                    {
                      backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface,
                      borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: isSelected ? theme.colors.textInverse : theme.colors.text,
                      fontSize: 16,
                      fontWeight: '600',
                      flex: 1,
                    }}
                  >
                    {l.label}
                  </Text>
                  {isSelected && (
                    <Text style={{ color: theme.colors.textInverse, fontSize: 18 }}>✓</Text>
                  )}
                </Pressable>
              );
            })}
            <Text
              style={{
                color: theme.colors.textMuted,
                fontSize: 12,
                textAlign: 'center',
                marginTop: 16,
              }}
            >
              {t('settings.rtlNotice')}
            </Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Password confirmation before deleting a password account. */}
      <Modal
        visible={passwordModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!deleting) setPasswordModal(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.dialogBackdrop}
        >
          <View style={[styles.dialog, { backgroundColor: theme.colors.surface }]}>
            <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '700' }}>
              {t('settings.deleteAccountTitle')}
            </Text>
            <Text style={{ color: theme.colors.textMuted, fontSize: 14 }}>
              {t('settings.deleteAccountPassword')}
            </Text>
            <Input
              label={t('auth.password')}
              secureTextEntry
              autoFocus
              autoComplete="password"
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                setPasswordError(null);
              }}
              errorText={passwordError ?? undefined}
            />
            <Button
              label={t('settings.deleteAccount')}
              variant="danger"
              loading={deleting}
              disabled={!password}
              onPress={() => void runDeleteAccount(password)}
              fullWidth
            />
            <Button
              label={t('common.cancel')}
              variant="ghost"
              disabled={deleting}
              onPress={() => setPasswordModal(false)}
              fullWidth
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View>
      <Text
        style={{
          color: theme.colors.textMuted,
          fontSize: 12,
          fontWeight: '700',
          letterSpacing: 1,
          marginBottom: 8,
          marginLeft: 4,
        }}
      >
        {title.toUpperCase()}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 0,
    minHeight: 44,
  },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    minHeight: 44,
  },
  separator: { height: StyleSheet.hairlineWidth },
  fullDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: -20,
    marginVertical: 4,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
    minHeight: 32,
  },
  deleteAccountRow: { alignItems: 'center', justifyContent: 'center', minHeight: 32 },
  dialogBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  dialog: { borderRadius: 20, padding: 20, gap: 12 },
});
