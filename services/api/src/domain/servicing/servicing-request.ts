export type ServicingType =
  | "fee_reversal"
  | "credit_limit_increase"
  | "card_replacement"
  | "freeze_card"
  | "unfreeze_card"
  | "autopay_setup"
  | "payment_date_change"
  | "contact_update"
  | "dispute"
  | "report_fraud";

export type ServicingPriority = "high" | "medium" | "low";

/**
 * Phase 1 requests are created ungated (`pending`). The deterministic policy
 * engine in Phase 2 decides approved/denied/escalated.
 */
export type ServicingStatus = "pending" | "in_review" | "approved" | "denied" | "escalated";

export interface ServicingRequest {
  readonly id: string;
  readonly customerId: string;
  readonly type: ServicingType;
  readonly priority: ServicingPriority;
  readonly status: ServicingStatus;
  readonly cardId?: string;
  readonly details: Record<string, unknown>;
  readonly createdAt: string; // ISO
}

const HIGH: ReadonlySet<ServicingType> = new Set([
  "fee_reversal",
  "credit_limit_increase",
  "card_replacement",
  "dispute",
  "report_fraud",
]);

/** Priority mirrors the product spec (High vs Medium request classes). */
export function priorityForType(type: ServicingType): ServicingPriority {
  return HIGH.has(type) ? "high" : "medium";
}
