import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/store/authStore';

export default function MainLayout() {
  const user = useAuthStore((s) => s.user);
  const isGuest = useAuthStore((s) => s.isGuest);

  // (main) is open to signed-in users and guests. Only bounce to auth when
  // neither applies (e.g. a stale session after sign-out).
  if (!user && !isGuest) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />;
}
