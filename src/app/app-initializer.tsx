'use client';

import { type ReactNode, useEffect } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { useLocalization } from '@/components/localization/localization-provider';
import { getUserSettings } from './actions/scada-actions';

// This is a new client component to handle client-side effects like fetching settings.
export function AppInitializer({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { setLanguage } = useLocalization();

  useEffect(() => {
    if (user) {
      getUserSettings({ userId: user.uid })
        .then(settings => {
          if (settings?.language) {
            setLanguage(settings.language);
          }
        })
        .catch(error => {
          console.warn("Could not fetch user settings on load:", error);
        });
    }
  }, [user, setLanguage]);

  return <>{children}</>;
}
