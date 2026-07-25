import type { HealthStatus } from "./health-status";

/**
 * Outbound port. The application depends on this interface, never on a
 * concrete implementation — adapters plug in at the composition root.
 */
export interface HealthCheckPort {
  check(): Promise<HealthStatus>;
}
