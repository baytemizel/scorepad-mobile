import firestore from '@react-native-firebase/firestore';
import { MatchRecord } from '@/types';
import { useAuthStore } from '@/store/authStore';

const COL_USERS = 'users';
const COL_MATCHES = 'matches';

/**
 * Cloud sync for every signed-in user (free or premium). Guests have no
 * account and nothing is persisted for them.
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
  if (!user) return;
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
  if (!user) return [];
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

/**
 * Delete everything stored in the cloud for `uid`: every match, then the user
 * document. Used by account deletion, so unlike the helpers above it throws —
 * the caller must not delete the account unless this finished. Reads go to the
 * server so an offline device fails fast instead of waiting on deletes that
 * can't reach it.
 */
export async function deleteUserDataFromCloud(uid: string): Promise<void> {
  const userDoc = firestore().collection(COL_USERS).doc(uid);
  // A batch holds at most 500 writes, so delete page by page until none remain.
  for (;;) {
    const page = await userDoc
      .collection(COL_MATCHES)
      .limit(500)
      .get({ source: 'server' });
    if (page.empty) break;
    const batch = firestore().batch();
    page.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  await userDoc.delete();
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
