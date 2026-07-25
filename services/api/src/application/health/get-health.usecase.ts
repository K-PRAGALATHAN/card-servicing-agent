import type { HealthCheckPort } from "../../domain/health/health-check.port";
import type { HealthStatus } from "../../domain/health/health-status";

/**
 * Application use case. Orchestrates the domain via ports; knows nothing
 * about HTTP, databases, or the LLM.
 */
export class GetHealthUseCase {
  constructor(private readonly healthCheck: HealthCheckPort) {}

  async execute(): Promise<HealthStatus> {
    return this.healthCheck.check();
  }
}
