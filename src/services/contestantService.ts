import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Contestant } from '../types';

const COLLECTION = 'contestants';

export const addContestant = async (data: Omit<Contestant, 'id'>) => {
  const docRef = await addDoc(collection(db, COLLECTION), data);
  return docRef.id;
};

export const updateContestant = async (id: string, data: Partial<Contestant>) => {
  await updateDoc(doc(db, COLLECTION, id), data as Record<string, unknown>);
};

export const deleteContestant = async (id: string) => {
  await deleteDoc(doc(db, COLLECTION, id));
};

export const subscribeContestantsByCompetition = (
  competitionId: string,
  callback: (contestants: Contestant[]) => void
): Unsubscribe => {
  const q = query(
    collection(db, COLLECTION),
    where('competitionId', '==', competitionId)
  );
  return onSnapshot(q, (snapshot) => {
    const contestants = snapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    })) as Contestant[];
    contestants.sort((a, b) => a.number - b.number);
    callback(contestants);
  });
};

export const eliminateContestant = async (id: string, round: number) => {
  await updateDoc(doc(db, COLLECTION, id), { eliminatedAtRound: round });
};

export const advanceContestant = async (id: string) => {
  await updateDoc(doc(db, COLLECTION, id), { eliminatedAtRound: null, manuallySelected: false });
};

export const manuallySelectContestant = async (id: string, selected: boolean) => {
  await updateDoc(doc(db, COLLECTION, id), { manuallySelected: selected });
};
