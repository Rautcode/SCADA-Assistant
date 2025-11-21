
"use client";

import { AuthProvider } from "@/components/auth/auth-provider";
import { DataProvider } from "@/components/database/data-provider";
import { LocalizationProvider } from "@/components/localization/localization-provider";
import { FirebaseClientProvider } from "@/lib/firebase/client-provider";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <FirebaseClientProvider>
            <AuthProvider>
                <LocalizationProvider>
                    <DataProvider>
                        {children}
                    </DataProvider>
                </LocalizationProvider>
            </AuthProvider>
        </FirebaseClientProvider>
    )
}
