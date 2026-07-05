import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Competition } from '../types';

const COLLECTION = 'competitions';

export const addCompetition = async (data: Omit<Competition, 'id' | 'createdAt'>) => {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    createdAt: new Date(),
  });
  return docRef.id;
};

export const updateCompetition = async (id: string, data: Partial<Competition>) => {
  await updateDoc(doc(db, COLLECTION, id), data as Record<string, unknown>);
};

export const deleteCompetition = async (id: string) => {
  await deleteDoc(doc(db, COLLECTION, id));
};

export const subscribeCompetitions = (
  callback: (competitions: Competition[]) => void
): Unsubscribe => {
  const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const competitions = snapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    })) as Competition[];
    callback(competitions);
  });
};

export const getCompetitions = async (): Promise<Competition[]> => {
  const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    ...doc.data(),
    id: doc.id,
  })) as Competition[];
};
