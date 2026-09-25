import { useState, useEffect } from 'react';
import { auth } from './firebase';
import { store } from '../store';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile, 
  signOut,
  onAuthStateChanged,
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

    const unsubscribe = onAuthStateChanged(auth, (user: FirebaseUser | null) => {
      if (!mounted) return;
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
  const cleanId = (id || '').trim().toLowerCase();
  if (!cleanId) throw { code: 'auth/invalid-email', message: 'Please enter your email or username.' };
  if (!password) throw { code: 'auth/wrong-password', message: 'Please enter your password.' };

  // Candidate emails to attempt
  const candidateEmails: string[] = [];

  if (cleanId.includes('@')) {
    candidateEmails.push(cleanId);
  } else {
    // 1. Search registered users in store
    const users = store.getUsers();
    const matched = users.find(u => 
      (u.customId && u.customId.toLowerCase() === cleanId) ||
      (u.displayName && u.displayName.toLowerCase() === cleanId) ||
      (u.email && u.email.toLowerCase().split('@')[0] === cleanId)
    );
    if (matched && matched.email) {
      candidateEmails.push(matched.email.toLowerCase());
    }

    // 2. Default store domain fallback
    candidateEmails.push(`${cleanId}@armanxstore.com`);
    candidateEmails.push(`${cleanId}@gmail.com`);
  }

  let lastError: any = null;

  for (const email of candidateEmails) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const customId = user.email?.split('@')[0] || cleanId;
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
        customId
      };
    } catch (err: any) {
      lastError = err;
      // If error is wrong password or too many requests, stop early
      if (err?.code === 'auth/wrong-password' || err?.code === 'auth/too-many-requests') {
        break;
      }
    }
  }

  const code = lastError?.code || 'auth/invalid-credential';
  let message = 'Invalid email/username or password.';
  if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') {
    message = 'Invalid email/username or password. If you are new, please register first.';
  } else if (code === 'auth/too-many-requests') {
    message = 'Too many failed login attempts. Please wait 1 minute before trying again.';
  } else if (lastError?.message) {
    message = lastError.message;
  }

  throw { code, message };
};

export const registerWithIdMock = async (id: string, password: string, name?: string) => {
  const cleanId = (id || '').trim().toLowerCase();
  if (!cleanId) throw { code: 'auth/invalid-email', message: 'Please enter an email or username.' };
  if (!password || password.length < 6) throw { code: 'auth/weak-password', message: 'Password must be at least 6 characters.' };

  const email = cleanId.includes('@') ? cleanId : `${cleanId}@armanxstore.com`;
  
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    if (name) {
      await updateProfile(user, { displayName: name });
    }
    
    const customId = cleanId.includes('@') ? cleanId.split('@')[0] : cleanId;
    const displayName = name || user.displayName || customId;
    const role = (email === 'barikarman12@gmail.com' || email === 'barikarman207@gmail.com' || email.includes('barikarman')) ? 'owner' : 'customer';

    await store.registerOrUpdateUser({
      uid: user.uid,
      email: user.email || email,
      displayName,
      customId,
      role,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      status: 'active'
    });

    return {
      uid: user.uid,
      email: user.email,
      displayName,
      customId
    };
  } catch (error: any) {
    let message = error.message || 'Registration failed.';
    if (error.code === 'auth/email-already-in-use') {
      message = 'An account with this email or username already exists. Please Log In.';
    } else if (error.code === 'auth/weak-password') {
      message = 'Password is too weak. Please use at least 6 characters.';
    }
    throw { code: error.code, message };
  }
};

export const resetPassword = async (email: string) => {
  const cleanEmail = (email || '').trim();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw { code: 'auth/invalid-email', message: 'Please enter a valid email address with @.' };
  }
  try {
    await sendPasswordResetEmail(auth, cleanEmail);
  } catch (error: any) {
    throw { code: error.code, message: error.message || 'Failed to send password reset email.' };
  }
};
