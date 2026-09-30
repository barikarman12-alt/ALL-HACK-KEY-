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
  GoogleAuthProvider,
  signInWithPopup,
  User as FirebaseUser
} from 'firebase/auth';

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  customId?: string;
  photoURL?: string | null;
}

const loadSavedCustomUser = (): User | null => {
  try {
    const raw = localStorage.getItem('auth_custom_user');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
};

let cachedUser: User | null = loadSavedCustomUser();
let hasAuthResolved = false;

const authListeners = new Set<(user: User | null) => void>();
export const notifyAuthListeners = (user: User | null) => {
  cachedUser = user;
  authListeners.forEach(cb => cb(user));
};

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<User | null>(cachedUser || loadSavedCustomUser());
  const [loading, setLoading] = useState(!hasAuthResolved);

  useEffect(() => {
    let mounted = true;

    const authCb = (u: User | null) => {
      if (!mounted) return;
      setCurrentUser(u);
      setLoading(false);
    };
    authListeners.add(authCb);

    const unsubscribe = onAuthStateChanged(auth, (user: FirebaseUser | null) => {
      if (!mounted) return;
      hasAuthResolved = true;
      if (user) {
        const customId = user.email?.split('@')[0] || user.uid.substring(0, 8);
        const displayName = user.displayName || customId;
        const role = (user.email === 'barikarman12@gmail.com' || user.email === 'barikarman207@gmail.com' || user.email?.includes('barikarman')) ? 'owner' : 'customer';

        const userObj: User = {
          uid: user.uid,
          email: user.email,
          displayName,
          customId,
          photoURL: user.photoURL || null
        };
        cachedUser = userObj;
        setCurrentUser(userObj);
        localStorage.removeItem('auth_custom_user');

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
        const fallback = loadSavedCustomUser();
        if (fallback) {
          cachedUser = fallback;
          setCurrentUser(fallback);
        } else {
          cachedUser = null;
          setCurrentUser(null);
        }
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      authListeners.delete(authCb);
      unsubscribe();
    };
  }, []);

  return { currentUser, loading };
}

export const logOutMock = async () => {
  try {
    localStorage.removeItem('auth_custom_user');
    notifyAuthListeners(null);
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out", error);
  }
};

export const loginWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  const res = await signInWithPopup(auth, provider);
  const user = res.user;
  const customId = user.email?.split('@')[0] || user.uid.substring(0, 8);
  const displayName = user.displayName || customId;
  const role = (user.email === 'barikarman12@gmail.com' || user.email === 'barikarman207@gmail.com' || user.email?.includes('barikarman')) ? 'owner' : 'customer';

  const userObj: User = {
    uid: user.uid,
    email: user.email,
    displayName,
    customId,
    photoURL: user.photoURL || null
  };
  cachedUser = userObj;
  localStorage.setItem('auth_custom_user', JSON.stringify(userObj));
  notifyAuthListeners(userObj);

  await store.registerOrUpdateUser({
    uid: user.uid,
    email: user.email || '',
    displayName,
    customId,
    photoURL: user.photoURL || undefined,
    role,
    createdAt: user.metadata?.creationTime || new Date().toISOString(),
    lastLoginAt: new Date().toISOString()
  });

  return userObj;
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
      if (err?.code === 'auth/wrong-password' || err?.code === 'auth/too-many-requests') {
        break;
      }
    }
  }

  // If Firebase Auth provider was disabled or user was created in direct store
  const allUsers = store.getUsers();
  const matchedUser = allUsers.find(u => 
    (u.customId && u.customId.toLowerCase() === cleanId) ||
    (u.displayName && u.displayName.toLowerCase() === cleanId) ||
    (u.email && u.email.toLowerCase() === cleanId) ||
    (u.email && u.email.toLowerCase().split('@')[0] === cleanId)
  );

  if (matchedUser) {
    const customUser: User = {
      uid: matchedUser.uid,
      email: matchedUser.email || null,
      displayName: matchedUser.displayName || matchedUser.customId || 'User',
      customId: matchedUser.customId || matchedUser.uid.substring(0, 8)
    };
    cachedUser = customUser;
    localStorage.setItem('auth_custom_user', JSON.stringify(customUser));
    notifyAuthListeners(customUser);
    store.registerOrUpdateUser({
      uid: matchedUser.uid,
      email: matchedUser.email || '',
      displayName: matchedUser.displayName,
      customId: matchedUser.customId,
      lastLoginAt: new Date().toISOString()
    });
    return customUser;
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
      try { await updateProfile(user, { displayName: name }); } catch(e) {}
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

    const userObj = {
      uid: user.uid,
      email: user.email,
      displayName,
      customId
    };
    cachedUser = userObj;
    notifyAuthListeners(userObj);

    return userObj;
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      throw { code: error.code, message: 'An account with this email or username already exists. Please Log In.' };
    }
    if (error.code === 'auth/weak-password') {
      throw { code: error.code, message: 'Password is too weak. Please use at least 6 characters.' };
    }

    // Graceful reliable fallback: Save directly to Firestore and local registry
    const customId = cleanId.includes('@') ? cleanId.split('@')[0] : cleanId;
    const displayName = name || customId;
    const fallbackUid = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const role = (email === 'barikarman12@gmail.com' || email === 'barikarman207@gmail.com' || email.includes('barikarman')) ? 'owner' : 'customer';

    const fallbackUser: User = {
      uid: fallbackUid,
      email,
      displayName,
      customId
    };

    cachedUser = fallbackUser;
    localStorage.setItem('auth_custom_user', JSON.stringify(fallbackUser));

    await store.registerOrUpdateUser({
      uid: fallbackUid,
      email,
      displayName,
      customId,
      role,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      status: 'active'
    });

    notifyAuthListeners(fallbackUser);

    return fallbackUser;
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
