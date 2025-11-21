
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
import type { AuthContextType, AuthProviderProps, LoginFunction, RegisterFunction, SendPasswordResetFunction } from '@/lib/types/auth';
import { useFirebase } from '@/lib/firebase/provider';


const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: AuthProviderProps) {
  const { auth } = useFirebase();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
        setLoading(false);
        return;
    };
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth]);

  const login: LoginFunction = async (email, password, rememberMe) => {
    if (!auth) {
        throw new Error("Firebase Auth is not initialized.");
    }
    const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
    await setPersistence(auth, persistence);
    return signInWithEmailAndPassword(auth, email, password);
  };

  const register: RegisterFunction = (email, password) => {
     if (!auth) {
        throw new Error("Firebase Auth is not initialized.");
    }
    return createUserWithEmailAndPassword(auth, email, password);
  };

  const logout = () => {
     if (!auth) {
        throw new Error("Firebase Auth is not initialized.");
    }
    return signOut(auth);
  };

  const sendPasswordReset: SendPasswordResetFunction = (email) => {
     if (!auth) {
        throw new Error("Firebase Auth is not initialized.");
    }
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
