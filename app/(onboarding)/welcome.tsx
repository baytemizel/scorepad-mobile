import React from 'react';
import { View, Text, StyleSheet, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';

const welcomeBg = require('../../assets/images/welcome.jpg');

export default function Welcome() {
  const { t } = useTranslation();

  return (
    <ImageBackground source={welcomeBg} style={styles.bg} resizeMode="cover">
      {/* Darkening overlay — light at the top so the artwork shows through,
          deeper at the bottom to keep the title and button legible. */}
      <LinearGradient
        colors={['rgba(11,18,32,0.25)', 'rgba(11,18,32,0.92)']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.spacer} />

        <View style={styles.footer}>
          <Animated.Text
            entering={FadeInDown.delay(150).duration(600)}
            style={styles.title}
          >
            {t('onboarding.welcome.title')}
          </Animated.Text>
          <Animated.Text
            entering={FadeInDown.delay(300).duration(600)}
            style={styles.subtitle}
          >
            {t('onboarding.welcome.subtitle')}
          </Animated.Text>

          <Animated.View entering={FadeInDown.delay(450).duration(600)}>
            <Button
              label={t('common.continue')}
              variant="primary"
              size="lg"
              fullWidth
              onPress={() => router.push('/(onboarding)/language')}
            />
          </Animated.View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  safe: { flex: 1 },
  spacer: { flex: 1 },
  footer: { padding: 24, paddingBottom: 32 },
  title: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    lineHeight: 23,
    marginBottom: 24,
  },
});
