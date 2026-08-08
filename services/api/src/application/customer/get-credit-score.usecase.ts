import type { CustomerRepository } from "../../domain/customer/customer.repository";
import { NotFoundError } from "../../domain/shared/errors";

export interface CreditScoreResult {
  readonly score: number;
  readonly band: "Poor" | "Fair" | "Good" | "Very Good" | "Excellent";
  readonly max: number;
  readonly updatedAt: string;
  readonly factors: { label: string; status: "good" | "watch" }[];
}

function bandFor(score: number): CreditScoreResult["band"] {
  if (score >= 800) return "Excellent";
  if (score >= 750) return "Very Good";
  if (score >= 700) return "Good";
  if (score >= 650) return "Fair";
  return "Poor";
}

/** Returns the customer's CIBIL-style score plus a few explanatory factors. */
export class GetCreditScoreUseCase {
  constructor(private readonly customers: CustomerRepository) {}

  async execute(customerId: string): Promise<CreditScoreResult> {
    const customer = await this.customers.findById(customerId);
    if (!customer) throw new NotFoundError("Customer", customerId);
    const score = customer.creditScore;
    return {
      score,
      band: bandFor(score),
      max: 900,
      updatedAt: new Date().toISOString(),
      factors: [
        { label: "On-time payments", status: "good" },
        { label: "Credit utilisation 24%", status: "good" },
        { label: "Recent hard enquiries", status: score >= 750 ? "good" : "watch" },
      ],
    };
  }
}
