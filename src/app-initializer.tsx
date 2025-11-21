
'use client';

import { type ReactNode, useEffect } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { useLocalization } from '@/components/localization/localization-provider';
import { getUserSettingsFlow } from '@/ai/flows/settings-flow';

// This function can be used to apply theme changes dynamically.
export function applyTheme(theme: string) {
  const root = window.document.documentElement;
  root.classList.remove("light", "dark");

  if (theme === "system") {
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    root.classList.add(systemTheme);
    return;
  }

  root.classList.add(theme);
}


// This is a client component to handle client-side effects like fetching settings.
export function AppInitializer({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { setLanguage } = useLocalization();

  useEffect(() => {
    if (user) {
      // No longer need to pass authToken
      getUserSettingsFlow()
        .then(settings => {
          if (settings?.language) {
            setLanguage(settings.language);
          }
          if (settings?.theme) {
            applyTheme(settings.theme);
          }
        })
        .catch(error => {
          console.warn("Could not fetch user settings on load:", error);
        });
    }
  }, [user, setLanguage]);

  return <>{children}</>;
}
