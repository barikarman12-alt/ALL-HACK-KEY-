import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore, 
  getFirestore,
  persistentLocalCache, 
  persistentMultipleTabManager,
  setLogLevel, 
  doc, 
  getDocFromServer 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with experimentalForceLongPolling and multi-tab persistence
// This prevents WebChannel streaming proxy buffering and the 10-second backend timeout in iframe environments
function createFirestoreInstance() {
  try {
    return initializeFirestore(
      app,
      {
        experimentalForceLongPolling: true,
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        })
      },
      firebaseConfig.firestoreDatabaseId
    );
  } catch {
    try {
      return initializeFirestore(
        app,
        {
          experimentalForceLongPolling: true
        },
        firebaseConfig.firestoreDatabaseId
      );
    } catch {
      return getFirestore(app, firebaseConfig.firestoreDatabaseId);
    }
  }
}

export const db = createFirestoreInstance();
export const auth = getAuth(app);

// Suppress benign client logs in browser console
setLogLevel('error');

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
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
  };
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
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Graceful connection test helper (as specified in Firebase skill)
async function testConnection() {
  try {
    const testPromise = getDocFromServer(doc(db, 'test', 'connection'));
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('connection-timeout')), 3500)
    );
    await Promise.race([testPromise, timeoutPromise]);
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firestore operating in offline-first mode with cached data.");
    }
  }
}

// Defer connection check so it does not compete with initial page render
if (typeof window !== 'undefined') {
  setTimeout(() => {
    testConnection().catch(() => {});
  }, 3500);
}

