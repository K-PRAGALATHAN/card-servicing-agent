import { describe, expect, it } from "vitest";

import { InMemoryServicingRequestRepository } from "../../adapters/outbound/memory/in-memory-repositories";
import { priorityForType } from "../../domain/servicing/servicing-request";
import { CreateServicingRequestUseCase } from "./create-servicing-request.usecase";

describe("priorityForType", () => {
  it("maps high-priority servicing types", () => {
    expect(priorityForType("fee_reversal")).toBe("high");
    expect(priorityForType("credit_limit_increase")).toBe("high");
    expect(priorityForType("report_fraud")).toBe("high");
  });

  it("maps medium-priority servicing types", () => {
    expect(priorityForType("autopay_setup")).toBe("medium");
    expect(priorityForType("payment_date_change")).toBe("medium");
    expect(priorityForType("contact_update")).toBe("medium");
  });
});

describe("CreateServicingRequestUseCase", () => {
  it("creates a pending request with derived priority and persists it", async () => {
    const repo = new InMemoryServicingRequestRepository();
    const useCase = new CreateServicingRequestUseCase(repo);

    const created = await useCase.execute({
      customerId: "c1",
      type: "credit_limit_increase",
      details: { requestedLimitMinor: 30_000_000 },
    });

    expect(created.status).toBe("pending");
    expect(created.priority).toBe("high");
    expect(await repo.listByCustomer("c1")).toHaveLength(1);
  });
});
