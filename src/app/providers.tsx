
"use client";

import { AuthProvider } from "@/components/auth/auth-provider";
import { LocalizationProvider } from "@/components/localization/localization-provider";
import { ConnectionProvider } from "@/components/database/connection-provider";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <LocalizationProvider>
                <ConnectionProvider>
                    {children}
                </ConnectionProvider>
            </LocalizationProvider>
        </AuthProvider>
    )
}
