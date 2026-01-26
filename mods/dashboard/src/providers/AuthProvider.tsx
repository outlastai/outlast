/**
 * Copyright (C) 2026 by Outlast.
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Client } from "@outlast/sdk";

const STORAGE_KEY = "outlast_access_token";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const client = useMemo(
    () =>
      new Client({
        endpoint: import.meta.env.VITE_API_ENDPOINT || "http://localhost:3000"
      }),
    []
  );

  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEY);
    if (token) {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    const response = await client.login(username, password);
    localStorage.setItem(STORAGE_KEY, response.accessToken);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setIsAuthenticated(false);
  };

  const value: AuthContextType = {
    isAuthenticated,
    isLoading,
    login,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
