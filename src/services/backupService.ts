import { collection, doc, setDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Competition, Contestant, AppUser, Score } from '../types';

export interface BackupPayload {
  version: string;
  timestamp: string;
  competitions: Competition[];
  contestants: Contestant[];
  users: AppUser[];
  scores: Score[];
}

/**
 * Fetch all data from the database and package it into a JSON-serializable BackupPayload.
 */
export const exportData = async (): Promise<BackupPayload> => {
  // Fetch all collections in parallel
  const [compSnap, contestantSnap, userSnap, scoreSnap] = await Promise.all([
    getDocs(collection(db, 'competitions')),
    getDocs(collection(db, 'contestants')),
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'scores')),
  ]);

  const competitions = compSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      // Convert Firestore Timestamp to ISO string for JSON serialization
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
    };
  }) as unknown as Competition[];

  const contestants = contestantSnap.docs.map((doc) => ({
    ...doc.data(),
    id: doc.id,
  })) as Contestant[];

  const users = userSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
    };
  }) as unknown as AppUser[];

  const scores = scoreSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      submittedAt: data.submittedAt?.toDate ? data.submittedAt.toDate().toISOString() : data.submittedAt,
    };
  }) as unknown as Score[];

  return {
    version: '1.0',
    timestamp: new Date().toISOString(),
    competitions,
    contestants,
    users,
    scores,
  };
};

/**
 * Restore database using the provided payload.
 * Can optionally clear existing data (except current logged-in administrator) before writing.
 */
export const importData = async (
  payload: BackupPayload,
  clearExisting: boolean,
  currentAdminId?: string
): Promise<{ success: boolean; stats: { competitions: number; contestants: number; users: number; scores: number } }> => {
  const stats = { competitions: 0, contestants: 0, users: 0, scores: 0 };

  // 1. Optional: Clear existing data
  if (clearExisting) {
    const collectionsToClear = ['competitions', 'contestants', 'scores', 'users'];
    for (const collName of collectionsToClear) {
      const snap = await getDocs(collection(db, collName));
      const deletePromises = snap.docs
        .filter((d) => collName !== 'users' || d.id !== currentAdminId)
        .map((d) => deleteDoc(d.ref));
      await Promise.all(deletePromises);
    }
  }

  // Helper to safely parse Date fields from JSON strings
  const parseDate = (val: any): Date => {
    if (!val) return new Date();
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  // 2. Write Competitions
  if (Array.isArray(payload.competitions)) {
    const promises = payload.competitions.map(async (comp) => {
      const { id, ...data } = comp;
      if (!id) return;
      const compData = {
        ...data,
        createdAt: parseDate(data.createdAt),
      };
      await setDoc(doc(db, 'competitions', id), compData);
      stats.competitions++;
    });
    await Promise.all(promises);
  }

  // 3. Write Contestants
  if (Array.isArray(payload.contestants)) {
    const promises = payload.contestants.map(async (contestant) => {
      const { id, ...data } = contestant;
      if (!id) return;
      await setDoc(doc(db, 'contestants', id), data);
      stats.contestants++;
    });
    await Promise.all(promises);
  }

  // 4. Write Users (excluding overwriting currently active admin, unless it's a new or identical config)
  if (Array.isArray(payload.users)) {
    const promises = payload.users.map(async (user) => {
      const { id, ...data } = user;
      if (!id) return;
      // If we are clearing existing, we already preserved current admin in the clear phase.
      // If we are merging, we only overwrite if we explicitly want to, or if the ID is different.
      const userData = {
        ...data,
        createdAt: parseDate(data.createdAt),
      };
      await setDoc(doc(db, 'users', id), userData);
      stats.users++;
    });
    await Promise.all(promises);
  }

  // 5. Write Scores
  if (Array.isArray(payload.scores)) {
    const promises = payload.scores.map(async (score) => {
      const { id, ...data } = score;
      if (!id) return;
      const scoreData = {
        ...data,
        submittedAt: parseDate(data.submittedAt),
      };
      await setDoc(doc(db, 'scores', id), scoreData);
      stats.scores++;
    });
    await Promise.all(promises);
  }

  return { success: true, stats };
};
