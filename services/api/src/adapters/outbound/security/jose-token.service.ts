import { SignJWT, jwtVerify } from "jose";

import { UnauthorizedError } from "../../../domain/shared/errors";
import type {
  AccessClaims,
  AuthTokens,
  TokenService,
} from "../../../application/auth/token.service";

interface TokenConfig {
  readonly secret: string;
  readonly accessTtl: string;
  readonly refreshTtl: string;
}

const ALG = "HS256";

/** HS256 JWTs via jose. Access tokens are short-lived; refresh mints new ones. */
export class JoseTokenService implements TokenService {
  private readonly key: Uint8Array;

  constructor(private readonly config: TokenConfig) {
    this.key = new TextEncoder().encode(config.secret);
  }

  async issue(customerId: string): Promise<AuthTokens> {
    const accessToken = await this.sign(customerId, "access", this.config.accessTtl);
    const refreshToken = await this.sign(customerId, "refresh", this.config.refreshTtl);
    const { payload } = await jwtVerify(accessToken, this.key);
    const expiresInSeconds = Math.max(0, (payload.exp ?? 0) - Math.floor(Date.now() / 1000));
    return { accessToken, refreshToken, expiresInSeconds };
  }

  async verifyAccess(token: string): Promise<AccessClaims> {
    const payload = await this.verify(token, "access");
    return { customerId: String(payload.sub) };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const payload = await this.verify(refreshToken, "refresh");
    return this.issue(String(payload.sub));
  }

  private sign(customerId: string, type: "access" | "refresh", ttl: string): Promise<string> {
    return new SignJWT({ typ: type })
      .setProtectedHeader({ alg: ALG })
      .setSubject(customerId)
      .setIssuedAt()
      .setExpirationTime(ttl)
      .sign(this.key);
  }

  private async verify(token: string, expected: "access" | "refresh") {
    try {
      const { payload } = await jwtVerify(token, this.key);
      if (payload.typ !== expected) {
        throw new UnauthorizedError(`Expected ${expected} token`);
      }
      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedError) throw error;
      throw new UnauthorizedError("Invalid or expired token");
    }
  }
}
