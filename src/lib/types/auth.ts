
import { User, UserCredential } from "firebase/auth";
import { ReactNode } from "react";

export type LoginFunction = (email: string, password: string, rememberMe: boolean) => Promise<UserCredential>;
export type RegisterFunction = (email: string, password: string) => Promise<UserCredential>;
export type LogoutFunction = () => Promise<void>;
export type SendPasswordResetFunction = (email: string) => Promise<void>;

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: LoginFunction;
  register: RegisterFunction;
  logout: LogoutFunction;
  sendPasswordReset: SendPasswordResetFunction;
}

export interface AuthProviderProps {
  children: ReactNode;
}
