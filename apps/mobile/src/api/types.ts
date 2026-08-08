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

export type CardTier = "Classic" | "Platinum" | "Millennia" | "Business";

export interface Card {
  id: string;
  type: "credit" | "debit";
  network: string;
  maskedPan: string;
  holderName: string;
  expiry: string;
  status: "active" | "frozen" | "blocked";
  tier: CardTier;
  availableLimit?: Money;
  availableBalance?: Money;
  domesticLimit?: Money;
  internationalLimit?: Money;
  internationalEnabled: boolean;
}

export type TransactionDirection = "debit" | "credit";
export type TransactionCategory =
  "transfer" | "bill" | "recharge" | "card_upgrade" | "fee" | "refund" | "purchase";

export interface Transaction {
  id: string;
  accountId: string;
  cardId?: string;
  direction: TransactionDirection;
  amount: Money;
  category: TransactionCategory;
  description: string;
  counterparty?: string;
  balanceAfter: Money;
  createdAt: string;
}

export interface TransferReceipt {
  from: Account;
  to: Account;
  amountMinor: number;
  transactions: Transaction[];
}

export interface PaymentReceipt {
  account: Account;
  transaction: Transaction;
}

export interface UpgradeOffer {
  tier: Exclude<CardTier, "Classic">;
  name: string;
  tagline: string;
  joiningFeeMinor: number;
  domesticLimitMinor: number;
  internationalLimitMinor: number;
  internationalEnabled: boolean;
  perks: string[];
}

export interface UpgradeReceipt {
  card: Card;
  account: Account;
  feeMinor: number;
  transaction: Transaction;
}

export interface StatementLine {
  date: string;
  description: string;
  amount: Money;
  kind: "debit" | "credit";
}

export interface Statement {
  id: string;
  cardId: string;
  periodStart: string;
  periodEnd: string;
  openingBalance: Money;
  closingBalance: Money;
  lines: StatementLine[];
}

export interface ServicingRequest {
  id: string;
  type: string;
  status: string;
  priority: string;
  createdAt: string;
}

export interface CreditScore {
  score: number;
  band: "Poor" | "Fair" | "Good" | "Very Good" | "Excellent";
  max: number;
  updatedAt: string;
  factors: { label: string; status: "good" | "watch" }[];
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
  /** Voice turns only. */
  transcript?: string;
  audio_base64?: string;
  audio_mime?: string;
}
