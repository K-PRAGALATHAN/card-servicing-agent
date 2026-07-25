import type { HealthStatusDTO } from "@card/shared-types";
import type { FastifyInstance } from "fastify";

import type { GetHealthUseCase } from "../../../application/health/get-health.usecase";

/**
 * Inbound HTTP adapter. Translates an HTTP request into a use-case call and
 * maps the domain result to the shared transport DTO. No business logic here.
 */
export function registerHealthRoutes(app: FastifyInstance, getHealth: GetHealthUseCase): void {
  app.get("/health", async (): Promise<HealthStatusDTO> => {
    const status = await getHealth.execute();
    return {
      service: status.service,
      state: status.state,
      checkedAt: status.checkedAt,
    };
  });
}
