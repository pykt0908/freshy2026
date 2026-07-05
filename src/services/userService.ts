import {
  collection,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  getDocs,
} from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { AppUser } from '../types';

const COLLECTION = 'users';

export const subscribeUsers = (
  callback: (users: AppUser[]) => void
): Unsubscribe => {
  const q = query(collection(db, COLLECTION));
  return onSnapshot(q, (snapshot) => {
    const users = snapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    })) as AppUser[];
    users.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
    callback(users);
  });
};

export const subscribeJudges = (
  callback: (users: AppUser[]) => void
): Unsubscribe => {
  const q = query(
    collection(db, COLLECTION),
    where('role', '==', 'judge')
  );
  return onSnapshot(q, (snapshot) => {
    const users = snapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    })) as AppUser[];
    users.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
    callback(users);
  });
};

export const updateUser = async (id: string, data: Partial<AppUser>) => {
  await updateDoc(doc(db, COLLECTION, id), data as Record<string, unknown>);
};

export const deleteUser = async (id: string) => {
  await deleteDoc(doc(db, COLLECTION, id));
};

export const getJudgesByCompetition = async (competitionId: string): Promise<AppUser[]> => {
  const q = query(
    collection(db, COLLECTION),
    where('role', '==', 'judge'),
    where('competitionIds', 'array-contains', competitionId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    ...doc.data(),
    id: doc.id,
  })) as AppUser[];
};
