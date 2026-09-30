import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, signOut, deleteUser, onAuthStateChanged, signInAnonymously, sendPasswordResetEmail } from 'firebase/auth';
import { 
  getFirestore, doc, getDoc, getDocs, setDoc, updateDoc, addDoc, deleteDoc, 
  collection, query, where, onSnapshot, orderBy, limit, increment, getDocFromServer, runTransaction, serverTimestamp,
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
// Use persistentLocalCache (modern Firebase 9+ API) instead of deprecated enableMultiTabIndexedDbPersistence
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
}, firebaseConfig.firestoreDatabaseId);


export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export {
  doc, getDoc, getDocs, setDoc, updateDoc, addDoc, deleteDoc,
  collection, query, where, onSnapshot, orderBy, limit, increment, runTransaction, serverTimestamp,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, signOut, deleteUser, onAuthStateChanged, signInAnonymously, sendPasswordResetEmail
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const resetAuthSystem = () => { 
  localStorage.clear(); 
  sessionStorage.clear(); 
  window.location.reload(); 
};

export function parseUserProfile(data: any): any {
  if (!data) return null;

  // Handle Firebase Timestamps for date fields
  const ensureIsoString = (val: any) => {
    if (!val) return null;
    if (typeof val === 'string') return val;
    if (val.toDate && typeof val.toDate === 'function') return val.toDate().toISOString();
    if (val.seconds) return new Date(val.seconds * 1000).toISOString();
    return String(val);
  };

  return {
    ...data,
    todayTeamEarnings: data.todayTeamEarnings || 0,
    todayTaskEarnings: data.todayTaskEarnings || 0,
    totalEarnings: data.totalEarnings || 0,
    balance: data.balance || 0,
    tasksCompletedCount: data.tasksCompletedCount || 0,
    completedDaysCount: data.completedDaysCount || 0,
    displayName: data.displayName || '',
    phone: data.phone || '',
    dob: data.dob || '',
    kycCompleted: data.kycCompleted || false,
    referralCode: data.referralCode || data.userId?.substring(0, 6).toUpperCase() || 'UNKNOWN',
    currentPlan: data.currentPlan || 'none',
    updatedAt: ensureIsoString(data.updatedAt),
    planExpiry: ensureIsoString(data.planExpiry),
    lastTaskDate: ensureIsoString(data.lastTaskDate)
  };
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

export async function verifyClockIntegrity(showNotification: (msg: string, opts?: any) => void): Promise<boolean> {
  let serverTime: number | null = null;

  try {
    // 1. Fetch live timestamp from secure Express backend
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const res = await fetch(`${backendUrl}/api/time`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      serverTime = new Date(data.datetime).getTime();
    }
  } catch (err) {
    console.warn("Could not connect to live backend clock, trying fallback clock...", err);
  }

  // 2. Fallback to public UTC time API if backend server is unreachable
  if (!serverTime) {
    try {
      const res = await fetch('https://worldtimeapi.org/api/timezone/Etc/UTC', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        serverTime = new Date(data.datetime).getTime();
      }
    } catch (err) {
      console.warn("Clock verification server unreachable. Bypassing live check.", err);
    }
  }

  const phoneTime = Date.now();

  let isTampered = false;
  let tamperReason = '';

  // Check: Server vs Phone Clock Drift — Forward tampering only (Max allowed drift: 3 minutes)
  if (serverTime) {
    const drift = phoneTime - serverTime;
    if (drift > 3 * 60 * 1000) { // phone is more than 3 min AHEAD of server
      isTampered = true;
      tamperReason = 'FORWARD CLOCK TAMPERING: Phone time is ahead of real world time.';
    }
  }

  // Check: Database Activity Rollback Check (Compare with Firestore lastTaskDate)
  if (!isTampered && auth.currentUser) {
    try {
      const userSnap = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (userSnap.exists()) {
        const data = userSnap.data();
        if (data.lastTaskDate) {
          const lastTaskMs = new Date(data.lastTaskDate).getTime();
          if (!isNaN(lastTaskMs) && phoneTime < lastTaskMs - 60000) {
            isTampered = true;
            tamperReason = 'TIME TRAVEL EXPLOIT DETECTED: Clock rolled back prior to completed task timestamp.';
          }
        }
      }
    } catch (dbErr) {
      console.warn("Firestore activity check warning:", dbErr);
    }
  }

  // Handle Tampering / Fraud Violation
  if (isTampered) {
    console.error(`SECURITY AUDIT FAILURE: ${tamperReason}`);
    if (auth.currentUser) {
      try {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(userRef, { isBlocked: true, banReason: tamperReason });
      } catch (e) {
        console.error("Failed to suspend clock-tampering account in Firestore", e);
      }
      await auth.signOut();
    }

    showNotification(`SECURITY VIOLATION: ${tamperReason} Your account has been suspended.`, { 
      type: 'error', 
      title: 'ACCOUNT BANNED' 
    });

    setTimeout(() => {
      window.location.reload();
    }, 3000);
    return false;
  }

  // (Monotonic timestamp storage removed — backward time check is disabled)

  return true;
}