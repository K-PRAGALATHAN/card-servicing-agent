import { AGENT_BASE, API_BASE } from "../config";
import type {
  Account,
  AgentTurn,
  AuthTokens,
  Card,
  CreditScore,
  Notification,
  PaymentReceipt,
  Profile,
  ServicingRequest,
  Statement,
  Transaction,
  TransferReceipt,
  UpgradeOffer,
  UpgradeReceipt,
} from "./types";

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

  transfer(
    token: string,
    body: { fromAccountId: string; toAccountId: string; amountMinor: number; note?: string },
  ): Promise<TransferReceipt> {
    return request(API_BASE, "/accounts/transfer", { method: "POST", token, body });
  },

  payBill(
    token: string,
    body: {
      fromAccountId: string;
      category: "bill" | "recharge";
      biller: string;
      reference?: string;
      amountMinor: number;
    },
  ): Promise<PaymentReceipt> {
    return request(API_BASE, "/payments/pay", { method: "POST", token, body });
  },

  getTransactions(token: string, limit = 30): Promise<Transaction[]> {
    return request(API_BASE, `/transactions?limit=${limit}`, { token });
  },

  setCardLimits(
    token: string,
    cardId: string,
    body: {
      domesticLimitMinor?: number;
      internationalLimitMinor?: number;
      internationalEnabled?: boolean;
    },
  ): Promise<Card> {
    return request(API_BASE, `/cards/${cardId}/limits`, { method: "POST", token, body });
  },

  resetCardPin(
    token: string,
    cardId: string,
    pin: string,
  ): Promise<{ cardId: string; message: string }> {
    return request(API_BASE, `/cards/${cardId}/reset-pin`, {
      method: "POST",
      token,
      body: { pin },
    });
  },

  getUpgradeOffers(token: string): Promise<UpgradeOffer[]> {
    return request(API_BASE, "/cards/upgrade-offers", { token });
  },

  upgradeCard(
    token: string,
    cardId: string,
    body: { tier: "Platinum" | "Millennia" | "Business"; fromAccountId: string },
  ): Promise<UpgradeReceipt> {
    return request(API_BASE, `/cards/${cardId}/upgrade`, { method: "POST", token, body });
  },

  getCreditScore(token: string): Promise<CreditScore> {
    return request(API_BASE, "/credit-score", { token });
  },

  getStatement(token: string, cardId: string): Promise<Statement> {
    return request(API_BASE, `/cards/${cardId}/statement`, { token });
  },

  raiseDispute(token: string, cardId: string): Promise<ServicingRequest> {
    return request(API_BASE, `/cards/${cardId}/dispute`, { method: "POST", token });
  },

  reportFraud(token: string, cardId: string): Promise<ServicingRequest> {
    return request(API_BASE, `/cards/${cardId}/report-fraud`, { method: "POST", token });
  },

  getNotifications(token: string): Promise<Notification[]> {
    return request(API_BASE, "/notifications", { token });
  },

  agentMessage(token: string, text: string, conversationId?: string): Promise<AgentTurn> {
    return request(AGENT_BASE, "/agent/message", {
      method: "POST",
      token,
      body: { text, conversation_id: conversationId },
    });
  },

  async agentVoice(token: string, audio: Blob, conversationId?: string): Promise<AgentTurn> {
    const form = new FormData();
    form.append("audio", audio, "speech.webm");
    if (conversationId) form.append("conversation_id", conversationId);
    const response = await fetch(`${AGENT_BASE}/agent/voice`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: form,
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    if (!response.ok) {
      throw new ApiError(
        (data && data.detail) || `Voice failed (${response.status})`,
        response.status,
      );
    }
    return data as AgentTurn;
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
