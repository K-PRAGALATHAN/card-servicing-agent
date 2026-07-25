import type { HealthCheckPort } from "../../../domain/health/health-check.port";
import type { HealthStatus } from "../../../domain/health/health-status";

/**
 * Outbound adapter implementing HealthCheckPort against the running process.
 * Later phases add DB/queue probes behind the same port.
 */
export class SystemHealthAdapter implements HealthCheckPort {
  constructor(
    private readonly serviceName: string,
    private readonly startedAt: number = Date.now(),
  ) {}

  async check(): Promise<HealthStatus> {
    return {
      service: this.serviceName,
      state: "healthy",
      uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
      checkedAt: new Date().toISOString(),
    };
  }
}
