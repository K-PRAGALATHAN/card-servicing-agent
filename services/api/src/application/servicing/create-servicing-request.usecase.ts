import { newId } from "../../domain/shared/ids";
import type { ServicingRequestRepository } from "../../domain/servicing/servicing-request.repository";
import type { ServicingRequest, ServicingType } from "../../domain/servicing/servicing-request";
import { priorityForType } from "../../domain/servicing/servicing-request";

export interface CreateServicingRequestInput {
  readonly customerId: string;
  readonly type: ServicingType;
  readonly cardId?: string;
  readonly details?: Record<string, unknown>;
}

/**
 * Creates a servicing request in `pending`. It is intentionally ungated in
 * Phase 1 — the Phase 2 policy engine decides the outcome. Dispute and
 * report_fraud are modelled as servicing types too.
 */
export class CreateServicingRequestUseCase {
  constructor(private readonly requests: ServicingRequestRepository) {}

  async execute(input: CreateServicingRequestInput): Promise<ServicingRequest> {
    const request: ServicingRequest = {
      id: newId("srq"),
      customerId: input.customerId,
      type: input.type,
      priority: priorityForType(input.type),
      status: "pending",
      ...(input.cardId !== undefined ? { cardId: input.cardId } : {}),
      details: input.details ?? {},
      createdAt: new Date().toISOString(),
    };
    await this.requests.create(request);
    return request;
  }
}
