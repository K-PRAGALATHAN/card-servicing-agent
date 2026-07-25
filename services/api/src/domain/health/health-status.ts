/**
 * Domain value object describing the health of a service.
 * Pure domain — no framework or transport concerns.
 */
export type ServiceState = "healthy" | "degraded" | "unhealthy";

export interface HealthStatus {
  readonly service: string;
  readonly state: ServiceState;
  readonly uptimeSeconds: number;
  readonly checkedAt: string; // ISO-8601
}
