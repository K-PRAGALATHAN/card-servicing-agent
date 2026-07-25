export interface AuthTokens {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresInSeconds: number;
}

export interface AccessClaims {
  readonly customerId: string;
}

export interface TokenService {
  issue(customerId: string): Promise<AuthTokens>;
  verifyAccess(token: string): Promise<AccessClaims>;
  refresh(refreshToken: string): Promise<AuthTokens>;
}
