
"use client";

import { ReactNode } from 'react';
import { FirebaseProvider } from './provider';

// This component ensures that FirebaseProvider is only rendered on the client side.
export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  return <FirebaseProvider>{children}</FirebaseProvider>;
}
