import { AGENT_BASE, API_BASE } from "../config";
import type { Account, AgentTurn, AuthTokens, Card, Notification, Profile } from "./types";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function request<T>(
  base: string,
  path: string,
  options: { method?: string; body?: unknown; token?: string | null } = {},
): Promise<T> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (options.token) headers.authorization = `Bearer ${options.token}`;

  const response = await fetch(`${base}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = (data && (data.message as string)) || `Request failed (${response.status})`;
    throw new ApiError(message, response.status);
  }
  return data as T;
}

export const api = {
  login(customerId: string, password: string): Promise<AuthTokens> {
    return request(API_BASE, "/auth/login", {
      method: "POST",
      body: { customerId, password },
    });
  },

  getProfile(token: string): Promise<Profile> {
    return request(API_BASE, "/me", { token });
  },

  getAccounts(token: string): Promise<Account[]> {
    return request(API_BASE, "/accounts", { token });
  },

  getCards(token: string): Promise<Card[]> {
    return request(API_BASE, "/cards", { token });
  },

  setCardFrozen(token: string, cardId: string, frozen: boolean): Promise<Card> {
    return request(API_BASE, `/cards/${cardId}/${frozen ? "freeze" : "unfreeze"}`, {
      method: "POST",
      token,
    });
  },

  getNotifications(token: string): Promise<Notification[]> {
    return request(API_BASE, "/notifications", { token });
  },

  agentMessage(customerId: string, text: string, conversationId?: string): Promise<AgentTurn> {
    return request(AGENT_BASE, "/agent/message", {
      method: "POST",
      body: { customer_id: customerId, text, conversation_id: conversationId },
    });
  },
};

export function formatMoney(m: { currency: string; amountMinor: number }): string {
  const major = (m.amountMinor / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const symbol = m.currency === "INR" ? "₹" : `${m.currency} `;
  return `${symbol}${major}`;
}
