import { describe, expect, it } from "vitest";

import type { HealthCheckPort } from "../../domain/health/health-check.port";
import type { HealthStatus } from "../../domain/health/health-status";
import { GetHealthUseCase } from "./get-health.usecase";

class StubHealthCheck implements HealthCheckPort {
  async check(): Promise<HealthStatus> {
    return {
      service: "test",
      state: "healthy",
      uptimeSeconds: 1,
      checkedAt: "2026-01-01T00:00:00.000Z",
    };
  }
}

describe("GetHealthUseCase", () => {
  it("returns the health status produced by the port", async () => {
    const useCase = new GetHealthUseCase(new StubHealthCheck());

    const result = await useCase.execute();

    expect(result.state).toBe("healthy");
    expect(result.service).toBe("test");
  });
});
