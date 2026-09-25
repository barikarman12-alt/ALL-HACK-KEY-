import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

export const db = initializeFirestore(
  app,
  {
    experimentalForceLongPolling: true,
    ignoreUndefinedProperties: true,
  },
  firebaseConfig.firestoreDatabaseId || '(default)'
);

export const auth = getAuth(app);

// Graceful connection test helper with timeout
async function testConnection() {
  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Connection check timeout')), 4000)
    );
    await Promise.race([
      getDocFromServer(doc(db, 'test', 'connection')),
      timeoutPromise,
    ]);
  } catch (error: any) {
    // Firestore operates gracefully with offline cache & long-polling
    if (error?.message?.includes('offline') || error?.message?.includes('timeout')) {
      // expected in offline or sandboxed preview
    }
  }
}

testConnection();
