import {
  collection,
  doc,
  addDoc,
  getDocs,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Score } from '../types';

const COLLECTION = 'scores';

export const submitScore = async (data: Omit<Score, 'id'>) => {
  // ตรวจสอบว่ากรรมการคนนี้ให้คะแนนผู้เข้าแข่งคนนี้ในรอบนี้แล้วหรือยัง
  const existing = await checkExistingScore(
    data.judgeId,
    data.contestantId,
    data.competitionId,
    data.round
  );
  if (existing) {
    throw new Error('คุณได้ให้คะแนนผู้เข้าแข่งขันคนนี้ไปแล้ว');
  }

  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    submittedAt: new Date(),
  });
  return docRef.id;
};

export const checkExistingScore = async (
  judgeId: string,
  contestantId: string,
  competitionId: string,
  round: number
): Promise<boolean> => {
  const q = query(
    collection(db, COLLECTION),
    where('judgeId', '==', judgeId),
    where('contestantId', '==', contestantId),
    where('competitionId', '==', competitionId),
    where('round', '==', round)
  );
  const snapshot = await getDocs(q);
  return !snapshot.empty;
};

export const subscribeScoresByCompetitionAndRound = (
  competitionId: string,
  round: number,
  callback: (scores: Score[]) => void
): Unsubscribe => {
  const q = query(
    collection(db, COLLECTION),
    where('competitionId', '==', competitionId),
    where('round', '==', round)
  );
  return onSnapshot(q, (snapshot) => {
    const scores = snapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    })) as Score[];
    callback(scores);
  });
};

export const getScoresByJudgeAndCompetition = async (
  judgeId: string,
  competitionId: string,
  round: number
): Promise<Score[]> => {
  const q = query(
    collection(db, COLLECTION),
    where('judgeId', '==', judgeId),
    where('competitionId', '==', competitionId),
    where('round', '==', round)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    ...doc.data(),
    id: doc.id,
  })) as Score[];
};
