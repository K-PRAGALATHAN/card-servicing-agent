import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

import { api } from "../api/client";
import { DEMO_CUSTOMER_ID } from "../config";
import { deleteItem, getItem, setItem } from "./storage";

const TOKEN_KEY = "cardservicing.accessToken";
const CUSTOMER_KEY = "cardservicing.customerId";

interface AuthValue {
  token: string | null;
  customerId: string | null;
  loading: boolean;
  login: (customerId: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [token, setToken] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [savedToken, savedCustomer] = await Promise.all([
          getItem(TOKEN_KEY),
          getItem(CUSTOMER_KEY),
        ]);
        if (savedToken) setToken(savedToken);
        if (savedCustomer) setCustomerId(savedCustomer);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      token,
      customerId,
      loading,
      async login(id, password) {
        const tokens = await api.login(id, password);
        await setItem(TOKEN_KEY, tokens.accessToken);
        await setItem(CUSTOMER_KEY, id || DEMO_CUSTOMER_ID);
        setToken(tokens.accessToken);
        setCustomerId(id);
      },
      async logout() {
        await deleteItem(TOKEN_KEY);
        await deleteItem(CUSTOMER_KEY);
        setToken(null);
        setCustomerId(null);
      },
    }),
    [token, customerId, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
