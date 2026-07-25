import Fastify, { type FastifyInstance } from "fastify";

import { GetHealthUseCase } from "../../../application/health/get-health.usecase";
import { SystemHealthAdapter } from "../../outbound/health/system-health.adapter";
import { registerHealthRoutes } from "./health.routes";

/**
 * Composition root for the HTTP inbound adapter: wires ports to adapters and
 * mounts routes. Keeping wiring here keeps the domain framework-agnostic.
 */
export function buildServer(): FastifyInstance {
  const app = Fastify({ logger: true });

  const healthCheck = new SystemHealthAdapter("card-servicing-api");
  const getHealth = new GetHealthUseCase(healthCheck);

  registerHealthRoutes(app, getHealth);

  return app;
}
