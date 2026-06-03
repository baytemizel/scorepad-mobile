import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { storageAdapter } from '@/services/storage';
import { UserProfile } from '@/types';

interface AuthState {
  user: UserProfile | null;
  isPremium: boolean;
  signInWithProfile: (profile: UserProfile) => void;
  signOut: () => void;
  setPremium: (premium: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isPremium: false,

      signInWithProfile: (profile) => set({ user: profile, isPremium: profile.isPremium }),

      signOut: () => set({ user: null, isPremium: false }),

      setPremium: (premium) => {
        set((state) => ({
          isPremium: premium,
          user: state.user ? { ...state.user, isPremium: premium } : state.user,
        }));
      },
    }),
    {
      name: 'scorepad/auth',
      storage: createJSONStorage(() => storageAdapter),
      version: 2,
      migrate: (persistedState: unknown, version: number) => {
        // v1 → v2: removed `isGuest` from UserProfile and dropped the guest
        // sign-in path. Legacy guest sessions get cleared (they must sign in
        // for real now); real accounts keep their session, we just drop the
        // deprecated field.
        if (version >= 2) return persistedState as AuthState;
        const state = (persistedState ?? {}) as {
          user?: { isGuest?: boolean; uid?: string; [k: string]: unknown } | null;
          isPremium?: boolean;
        };
        const u = state.user;
        if (
          !u ||
          u.isGuest === true ||
          (typeof u.uid === 'string' && u.uid.startsWith('guest-'))
        ) {
          return { user: null, isPremium: false } as AuthState;
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { isGuest, ...rest } = u;
        return {
          user: rest as unknown as AuthState['user'],
          isPremium: state.isPremium ?? false,
        } as AuthState;
      },
    },
  ),
);
