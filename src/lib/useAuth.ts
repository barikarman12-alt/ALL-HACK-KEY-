import { useState, useEffect } from 'react';

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
    // Check local storage for mocked user
    const checkUser = () => {
      const savedUser = localStorage.getItem('mockUser');
      if (savedUser) {
        try {
          setCurrentUser(JSON.parse(savedUser));
        } catch (e) {
          localStorage.removeItem('mockUser');
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    };

    checkUser();
    
    // Add event listener to sync state across components if needed
    window.addEventListener('auth-change', checkUser);
    return () => window.removeEventListener('auth-change', checkUser);
  }, []);

  return { currentUser, loading };
}

export const logOutMock = () => {
  localStorage.removeItem('mockUser');
  window.dispatchEvent(new Event('auth-change'));
};

export const loginWithIdMock = async (id: string, password: string) => {
  // simple mock, delay to feel real
  await new Promise(r => setTimeout(r, 500));
  
  const savedUsers = JSON.parse(localStorage.getItem('mockUsersDb') || '{}');
  const user = savedUsers[id.toLowerCase()];
  
  if (!user || user.password !== password) {
    throw { code: 'auth/invalid-credential', message: 'Invalid User ID or password.' };
  }
  
  const mockUser: User = {
    uid: user.uid,
    email: `${id}@dripclint.com`.toLowerCase(),
    displayName: id,
    customId: id
  };
  localStorage.setItem('mockUser', JSON.stringify(mockUser));
  window.dispatchEvent(new Event('auth-change'));
  return mockUser;
};

export const registerWithIdMock = async (id: string, password: string, name?: string) => {
  await new Promise(r => setTimeout(r, 500));
  
  const savedUsers = JSON.parse(localStorage.getItem('mockUsersDb') || '{}');
  const userIdL = id.toLowerCase();
  
  if (savedUsers[userIdL]) {
    throw { code: 'auth/email-already-in-use', message: 'Account exists.' };
  }
  
  const newUser = {
    uid: Math.random().toString(36).substring(2, 11),
    password,
    id: userIdL,
    name: name || id
  };
  savedUsers[userIdL] = newUser;
  localStorage.setItem('mockUsersDb', JSON.stringify(savedUsers));
  
  const mockUser: User = {
    uid: newUser.uid,
    email: `${userIdL}@dripclint.com`.toLowerCase(),
    displayName: newUser.name,
    customId: id
  };
  localStorage.setItem('mockUser', JSON.stringify(mockUser));
  window.dispatchEvent(new Event('auth-change'));
  return mockUser;
};
