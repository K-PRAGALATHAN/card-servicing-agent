import type { FastifyInstance, preHandlerHookHandler } from "fastify";

import type { AppContainer } from "../../../container";

export function registerProfileRoutes(
  app: FastifyInstance,
  c: AppContainer,
  auth: preHandlerHookHandler,
): void {
  app.get(
    "/me",
    { preHandler: auth, schema: { tags: ["customer"], summary: "Get my profile (incl. KYC)" } },
    async (request) => c.getProfile.execute(request.customerId),
  );

  app.get(
    "/credit-score",
    { preHandler: auth, schema: { tags: ["customer"], summary: "My CIBIL-style credit score" } },
    async (request) => c.getCreditScore.execute(request.customerId),
  );
}
