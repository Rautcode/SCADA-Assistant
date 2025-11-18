
"use client";

import { AuthProvider } from "@/components/auth/auth-provider";
import { LocalizationProvider } from "@/components/localization/localization-provider";
import { FirebaseClientProvider } from "@/lib/firebase/client-provider";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <FirebaseClientProvider>
            <AuthProvider>
                <LocalizationProvider>
                    {children}
                </LocalizationProvider>
            </AuthProvider>
        </FirebaseClientProvider>
    )
}

    