import { useState, useEffect } from 'react';
import { auth } from './firebase';
import { store } from '../store';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile, 
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  sendPasswordResetEmail,
  User as FirebaseUser
} from 'firebase/auth';

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  customId?: string;
}

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    // Check for redirect result when the component mounts
    const checkRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result && mounted) {
           sessionStorage.removeItem('isGoogleLoginPending');
        }
      } catch (error) {
        console.error("Google Sign-in redirect error:", error);
        sessionStorage.removeItem('isGoogleLoginPending');
      }
    };
    checkRedirectResult();

    const unsubscribe = onAuthStateChanged(auth, (user: FirebaseUser | null) => {
      if (user) {
        const customId = user.email?.split('@')[0] || user.uid.substring(0, 8);
        const displayName = user.displayName || customId;
        const role = (user.email === 'barikarman12@gmail.com' || user.email === 'barikarman207@gmail.com' || user.email?.includes('barikarman')) ? 'owner' : 'customer';

        setCurrentUser({
          uid: user.uid,
          email: user.email,
          displayName,
          customId
        });

        // Sync to store & database
        store.registerOrUpdateUser({
          uid: user.uid,
          email: user.email || '',
          displayName,
          customId,
          photoURL: user.photoURL || undefined,
          role,
          createdAt: user.metadata?.creationTime || new Date().toISOString(),
          lastLoginAt: new Date().toISOString()
        });

        sessionStorage.removeItem('isGoogleLoginPending');
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return { currentUser, loading };
}

export const logOutMock = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out", error);
  }
};

export const loginWithIdMock = async (id: string, password: string) => {
  const email = id.includes('@') ? id : `${id}@armanxstore.com`.toLowerCase();
  
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const customId = id;
    const displayName = user.displayName || customId;

    store.registerOrUpdateUser({
      uid: user.uid,
      email: user.email || email,
      displayName,
      customId,
      lastLoginAt: new Date().toISOString()
    });

    return {
      uid: user.uid,
      email: user.email,
      displayName,
      customId: id
    };
  } catch (error: any) {
    throw { code: error.code, message: error.message || 'Invalid credentials.' };
  }
};

export const registerWithIdMock = async (id: string, password: string, name?: string) => {
  const email = id.includes('@') ? id : `${id}@armanxstore.com`.toLowerCase();
  
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    if (name) {
      await updateProfile(user, { displayName: name });
    }
    
    const displayName = name || user.displayName || id;
    const role = (email === 'barikarman12@gmail.com' || email === 'barikarman207@gmail.com' || email.includes('barikarman')) ? 'owner' : 'customer';

    await store.registerOrUpdateUser({
      uid: user.uid,
      email: user.email || email,
      displayName,
      customId: id,
      role,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      status: 'active'
    });

    return {
      uid: user.uid,
      email: user.email,
      displayName,
      customId: id
    };
  } catch (error: any) {
    throw { code: error.code, message: error.message || 'Registration failed.' };
  }
};

export const resetPassword = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    throw { code: error.code, message: error.message || 'Failed to send password reset email.' };
  }
};
