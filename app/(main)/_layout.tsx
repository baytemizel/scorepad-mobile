import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/store/authStore';

export default function MainLayout() {
  const user = useAuthStore((s) => s.user);

  // Defense-in-depth: every (main) route requires a signed-in user.
  // If somehow we land here without one, bounce back to auth.
  if (!user) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />;
}
