
'use client';

import { useAuth } from '@/components/auth/auth-provider';
import { useLocalization } from '@/components/localization/localization-provider';
import { useEffect, type ReactNode } from 'react';
import { getUserSettings } from './actions/settings-actions';

export function applyTheme(theme: string) {
  const root = window.document.documentElement;
  root.classList.remove("light", "dark");
  if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      root.classList.add(systemTheme);
  } else {
      root.classList.add(theme);
  }
}

// This is a client component to handle client-side effects like fetching settings.
export function AppInitializer({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const { setLanguage } = useLocalization();

  useEffect(() => {
    // Only run this effect if the user object is available and not loading
    if (user && !loading) {
      getUserSettings({ userId: user.uid })
        .then(settings => {
          if (settings) {
            if (settings.language) {
              setLanguage(settings.language);
            }
            if (settings.theme) {
              applyTheme(settings.theme);
            }
          }
        })
        .catch(error => {
          console.warn("Could not fetch user settings on load:", error);
        });
    }
  }, [user, loading, setLanguage]);

  return <>{children}</>;
}
