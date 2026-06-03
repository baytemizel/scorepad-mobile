import firestore from '@react-native-firebase/firestore';
import { MatchRecord } from '@/types';
import { useAuthStore } from '@/store/authStore';

const COL_USERS = 'users';
const COL_MATCHES = 'matches';

/**
 * Cloud sync for premium users. Anonymous/free users only have local storage.
 *
 * Schema:
 *   users/{uid}
 *     isPremium: bool
 *     updatedAt: serverTimestamp
 *   users/{uid}/matches/{matchId}
 *     ...MatchRecord fields
 */

export async function syncMatchToCloud(record: MatchRecord): Promise<void> {
  const user = useAuthStore.getState().user;
  if (!user || !user.isPremium) return;
  try {
    await firestore()
      .collection(COL_USERS)
      .doc(user.uid)
      .collection(COL_MATCHES)
      .doc(record.id)
      .set({
        ...record,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });
  } catch (e) {
    console.warn('[Firestore] sync match failed', e);
  }
}

export async function deleteMatchFromCloud(matchId: string): Promise<void> {
  const user = useAuthStore.getState().user;
  if (!user) return;
  try {
    await firestore()
      .collection(COL_USERS)
      .doc(user.uid)
      .collection(COL_MATCHES)
      .doc(matchId)
      .delete();
  } catch {
    // ignore
  }
}

export async function fetchMatchesFromCloud(): Promise<MatchRecord[]> {
  const user = useAuthStore.getState().user;
  if (!user || !user.isPremium) return [];
  try {
    const snap = await firestore()
      .collection(COL_USERS)
      .doc(user.uid)
      .collection(COL_MATCHES)
      .orderBy('finishedAt', 'desc')
      .limit(500)
      .get();
    return snap.docs.map((d) => d.data() as MatchRecord);
  } catch (e) {
    console.warn('[Firestore] fetch matches failed', e);
    return [];
  }
}

export async function setUserPremiumFlag(isPremium: boolean): Promise<void> {
  const user = useAuthStore.getState().user;
  if (!user) return;
  try {
    await firestore()
      .collection(COL_USERS)
      .doc(user.uid)
      .set(
        {
          isPremium,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
  } catch {
    // ignore
  }
}
