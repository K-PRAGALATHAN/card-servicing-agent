/**
 * Cross-cutting types shared between services and frontends.
 * Kept transport-agnostic (DTOs), not domain entities.
 */
export type ServiceState = "healthy" | "degraded" | "unhealthy";

export interface HealthStatusDTO {
  service: string;
  state: ServiceState;
  checkedAt: string;
}
