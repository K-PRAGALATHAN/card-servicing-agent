export interface AppConfig {
  readonly port: number;
  readonly host: string;
  readonly nodeEnv: string;
  readonly jwtSecret: string;
  /** Access token TTL, e.g. "10m" — deliberately short (fast session expiry). */
  readonly accessTokenTtl: string;
  /** Refresh token TTL, e.g. "7d". */
  readonly refreshTokenTtl: string;
}

export function loadConfig(): AppConfig {
  return {
    port: Number(process.env.PORT ?? 4000),
    host: process.env.HOST ?? "0.0.0.0",
    nodeEnv: process.env.NODE_ENV ?? "development",
    jwtSecret: process.env.JWT_SECRET ?? "dev-secret-change-me",
    accessTokenTtl: process.env.ACCESS_TOKEN_TTL ?? "10m",
    refreshTokenTtl: process.env.REFRESH_TOKEN_TTL ?? "7d",
  };
}
