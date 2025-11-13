
"use client";

import { AuthProvider } from "@/components/auth/auth-provider";
import { LocalizationProvider } from "@/components/localization/localization-provider";
import { ConnectionProvider } from "@/components/database/connection-provider";
import { FirebaseClientProvider } from "@/lib/firebase/client-provider";
import { DataProvider } from "@/components/database/data-provider";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <FirebaseClientProvider>
            <AuthProvider>
                <LocalizationProvider>
                    <ConnectionProvider>
                        <DataProvider>
                            {children}
                        </DataProvider>
                    </ConnectionProvider>
                </LocalizationProvider>
            </AuthProvider>
        </FirebaseClientProvider>
    )
}
