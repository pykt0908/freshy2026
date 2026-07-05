import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { AppUser } from '../types';

const COLLECTION = 'users';

// Login ด้วย username + password (เก็บใน Firestore)
export const loginUser = async (username: string, password: string): Promise<AppUser> => {
  const q = query(
    collection(db, COLLECTION),
    where('username', '==', username),
    where('password', '==', password)
  );
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
  }

  const userDoc = snapshot.docs[0];
  const userData = { ...userDoc.data(), id: userDoc.id } as AppUser;

  // บันทึก session ลง localStorage
  localStorage.setItem('freshy_user', JSON.stringify(userData));

  return userData;
};

// Logout
export const logoutUser = () => {
  localStorage.removeItem('freshy_user');
};

// ดึง user จาก localStorage
export const getCurrentUser = (): AppUser | null => {
  const stored = localStorage.getItem('freshy_user');
  if (!stored) return null;
  try {
    return JSON.parse(stored) as AppUser;
  } catch {
    return null;
  }
};

// สร้างบัญชีกรรมการ
export const createJudgeAccount = async (
  username: string,
  password: string,
  displayName: string,
  competitionIds: string[]
): Promise<AppUser> => {
  // ตรวจสอบ username ซ้ำ
  const q = query(collection(db, COLLECTION), where('username', '==', username));
  const existing = await getDocs(q);
  if (!existing.empty) {
    throw new Error('ชื่อผู้ใช้นี้มีอยู่แล้ว');
  }

  const id = crypto.randomUUID();
  const userData: AppUser = {
    id,
    username,
    password,
    displayName,
    role: 'judge',
    competitionIds,
    createdAt: new Date(),
  };

  await setDoc(doc(db, COLLECTION, id), userData);
  return userData;
};

// สร้างบัญชี Admin
export const createAdminAccount = async (
  username: string,
  password: string,
  displayName: string
): Promise<AppUser> => {
  const q = query(collection(db, COLLECTION), where('username', '==', username));
  const existing = await getDocs(q);
  if (!existing.empty) {
    throw new Error('ชื่อผู้ใช้นี้มีอยู่แล้ว');
  }

  const id = crypto.randomUUID();
  const userData: AppUser = {
    id,
    username,
    password,
    displayName,
    role: 'admin',
    competitionIds: [],
    createdAt: new Date(),
  };

  await setDoc(doc(db, COLLECTION, id), userData);
  return userData;
};

// อ่านข้อมูล user
export const getUserData = async (uid: string): Promise<AppUser | null> => {
  const { getDoc } = await import('firebase/firestore');
  const userDoc = await getDoc(doc(db, COLLECTION, uid));
  if (!userDoc.exists()) return null;
  return { ...userDoc.data(), id: userDoc.id } as AppUser;
};

// ติดตามข้อมูล user แบบ realtime (เช่น สิทธิ์หรือหน้าที่ที่เปลี่ยนแปลง)
export const subscribeUser = (uid: string, onUpdate: (user: AppUser | null) => void) => {
  const unsubscribe = onSnapshot(doc(db, COLLECTION, uid), (docSnap: any) => {
    if (docSnap.exists()) {
      const userData = { ...docSnap.data(), id: docSnap.id } as AppUser;
      localStorage.setItem('freshy_user', JSON.stringify(userData));
      onUpdate(userData);
    } else {
      onUpdate(null);
    }
  });
  return unsubscribe;
};
