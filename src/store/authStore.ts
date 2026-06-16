import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { storageAdapter } from '@/services/storage';
import { useMatchHistoryStore } from '@/store/matchHistoryStore';
import { UserProfile } from '@/types';

interface AuthState {
  user: UserProfile | null;
  /**
   * Guest mode: the user chose to skip sign-in. `user` stays null (no fake
   * account); we just remember the choice so routing lets them into (main)
   * without bouncing back to auth. Guests never persist match data.
   */
  isGuest: boolean;
  isPremium: boolean;
  signInWithProfile: (profile: UserProfile) => void;
  continueAsGuest: () => void;
  signOut: () => void;
  setPremium: (premium: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isGuest: false,
      isPremium: false,

      // Signing in always clears guest mode.
      signInWithProfile: (profile) =>
        set({ user: profile, isGuest: false, isPremium: profile.isPremium }),

      continueAsGuest: () => set({ user: null, isGuest: true }),

      signOut: () => {
        set({ user: null, isGuest: false, isPremium: false });
        // Wipe the local match cache so the next user/guest on a shared device
        // can't see the previous account's matches. This covers BOTH sign-out
        // paths: the explicit one (service signOut) and the Firebase
        // session-expiry handler in app/_layout.tsx, which both call this.
        // Cloud data is untouched and re-hydrates on the next sign-in.
        useMatchHistoryStore.getState().clearAll();
      },

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
      version: 3,
      migrate: (persistedState: unknown, version: number) => {
        // v2 → v3: reintroduced a top-level `isGuest` flag (separate from the
        // old per-user field). Existing sessions default to isGuest=false; the
        // default merge fills it in, but we set it explicitly to be safe.
        if (version >= 2) {
          return { isGuest: false, ...(persistedState as object) } as AuthState;
        }
        // v1 → v2: removed `isGuest` from UserProfile and dropped the guest
        // sign-in path. Legacy guest sessions get cleared (they must sign in
        // for real now); real accounts keep their session, we just drop the
        // deprecated field.
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
