
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  onAuthStateChanged,
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '@/lib/firebase/firebase';
import type { AuthContextType, AuthProviderProps, LoginFunction, RegisterFunction, SendPasswordResetFunction } from '@/lib/types/auth';
import { fetchWithAuth } from '@/lib/firebase/fetch-with-auth';


const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const originalFetch = window.fetch;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);

      if (user) {
        // When user logs in, override global fetch
        window.fetch = fetchWithAuth(originalFetch);
      } else {
        // When user logs out, restore original fetch
        window.fetch = originalFetch;
      }
    });

    return () => {
        unsubscribe();
        window.fetch = originalFetch; // Cleanup on unmount
    }
  }, []);

  const login: LoginFunction = async (email, password, rememberMe) => {
    if (!auth) {
        throw new Error("Firebase Auth is not initialized.");
    }
    const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
    await setPersistence(auth, persistence);
    return signInWithEmailAndPassword(auth, email, password);
  };

  const register: RegisterFunction = (email, password) => {
    return createUserWithEmailAndPassword(auth, email, password);
  };

  const logout = () => {
    return signOut(auth);
  };

  const sendPasswordReset: SendPasswordResetFunction = (email) => {
    // This now calls the standard firebase email function if needed, but our primary flow will use the custom action.
    return sendPasswordResetEmail(auth, email);
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    sendPasswordReset,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
