/** Response shapes from the Phase 1 API and Phase 2 agent. */

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
}

export interface Money {
  currency: string;
  amountMinor: number;
}

export interface Account {
  id: string;
  type: "savings" | "current";
  maskedNumber: string;
  balance: Money;
}

export interface Card {
  id: string;
  type: "credit" | "debit";
  network: string;
  maskedPan: string;
  holderName: string;
  expiry: string;
  status: "active" | "frozen" | "blocked";
  availableLimit?: Money;
  availableBalance?: Money;
}

export interface Kyc {
  panMasked: string;
  aadhaarMasked: string;
  status: "verified" | "pending";
}

export interface Profile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  kyc: Kyc;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  category: string;
  read: boolean;
  createdAt: string;
}

export type AgentReplyKind = "refuse" | "ask" | "confirm" | "answer" | "explain" | "escalate";

export interface AgentTurn {
  conversation_id: string;
  kind: AgentReplyKind;
  text: string;
  action: string | null;
  escalated: boolean;
  executed: boolean;
  audit_seq: number | null;
}
