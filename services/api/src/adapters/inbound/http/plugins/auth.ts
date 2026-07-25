import type { FastifyRequest, preHandlerHookHandler } from "fastify";

import type { TokenService } from "../../../../application/auth/token.service";
import { UnauthorizedError } from "../../../../domain/shared/errors";

declare module "fastify" {
  interface FastifyRequest {
    customerId: string;
  }
}

/** preHandler that requires a valid Bearer access token and sets request.customerId. */
export function makeAuthGuard(tokenService: TokenService): preHandlerHookHandler {
  return async (request: FastifyRequest) => {
    const header = request.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new UnauthorizedError("Missing bearer token");
    }
    const claims = await tokenService.verifyAccess(header.slice("Bearer ".length));
    request.customerId = claims.customerId;
  };
}
