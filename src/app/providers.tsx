
"use client";

import { AuthProvider } from "@/components/auth/auth-provider";
import { LocalizationProvider } from "@/components/localization/localization-provider";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <LocalizationProvider>
                {children}
            </LocalizationProvider>
        </AuthProvider>
    )
}
