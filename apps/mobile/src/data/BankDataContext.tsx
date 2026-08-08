import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

import { api } from "../api/client";
import type { Account, Card, CreditScore, Profile, Transaction } from "../api/types";
import { useAuth } from "../auth/AuthContext";

interface BankData {
  profile: Profile | null;
  accounts: Account[];
  cards: Card[];
  transactions: Transaction[];
  creditScore: CreditScore | null;
  loading: boolean;
  error: string | null;
  /** Re-fetch everything — call after any money movement so all tabs stay in sync. */
  refresh: () => Promise<void>;
}

const Ctx = createContext<BankData | null>(null);

export function BankDataProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { token } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [creditScore, setCreditScore] = useState<CreditScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      const [p, a, c, t, s] = await Promise.all([
        api.getProfile(token),
        api.getAccounts(token),
        api.getCards(token),
        api.getTransactions(token, 40),
        api.getCreditScore(token),
      ]);
      setProfile(p);
      setAccounts(a);
      setCards(c);
      setTransactions(t);
      setCreditScore(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load your data");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <Ctx.Provider
      value={{ profile, accounts, cards, transactions, creditScore, loading, error, refresh }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useBankData(): BankData {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useBankData must be used within BankDataProvider");
  return ctx;
}
