import { useState, useEffect } from 'react';
import { auth } from './firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile, 
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
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
        setCurrentUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          customId: user.email?.split('@')[0]
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

export const loginWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    sessionStorage.setItem('isGoogleLoginPending', 'true');
    await signInWithRedirect(auth, provider);
    
    // The code below won't execute because the page redirects immediately,
    // but we return a dummy response to satisfy TypeScript.
    return {
      uid: '',
      email: '',
      displayName: '',
      customId: ''
    };
  } catch (error: any) {
    sessionStorage.removeItem('isGoogleLoginPending');
    throw { code: error.code, message: error.message || 'Google Sign-In failed.' };
  }
};

export const loginWithIdMock = async (id: string, password: string) => {
  const email = id.includes('@') ? id : `${id}@armanxstore.com`.toLowerCase();
  
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
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
    
    return {
      uid: user.uid,
      email: user.email,
      displayName: name || user.displayName,
      customId: id
    };
  } catch (error: any) {
    throw { code: error.code, message: error.message || 'Registration failed.' };
  }
};
