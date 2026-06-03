import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/theme/ThemeProvider';
import { fontFamilies } from '@/theme/fonts';

export default function Welcome() {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={theme.gradients.hero} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={styles.content}>
          <Animated.View
            entering={FadeIn.duration(500)}
            style={styles.brandCircle}
          >
            <Text style={{ fontSize: 64 }}>🏆</Text>
          </Animated.View>

          <Animated.Text
            entering={FadeInDown.delay(200).duration(600)}
            style={styles.title}
          >
            {t('onboarding.welcome.title')}
          </Animated.Text>
          <Animated.Text
            entering={FadeInDown.delay(350).duration(600)}
            style={styles.subtitle}
          >
            {t('onboarding.welcome.subtitle')}
          </Animated.Text>
        </View>

        <Animated.View
          entering={FadeInDown.delay(500).duration(600)}
          style={styles.footer}
        >
          <Button
            label={t('common.continue')}
            variant="primary"
            size="lg"
            fullWidth
            onPress={() => router.push('/(onboarding)/sports')}
          />
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  brandCircle: {
    width: 140,
    height: 140,
    borderRadius: 32,
    backgroundColor: '#FFFFFF1A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
    fontFamily: fontFamilies.heading.bold,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    color: '#FFFFFFB3',
    fontSize: 17,
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
});
