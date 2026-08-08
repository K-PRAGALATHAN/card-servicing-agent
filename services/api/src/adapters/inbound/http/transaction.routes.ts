import type { FastifyInstance, preHandlerHookHandler } from "fastify";

import type { AppContainer } from "../../../container";

export function registerTransactionRoutes(
  app: FastifyInstance,
  c: AppContainer,
  auth: preHandlerHookHandler,
): void {
  app.get(
    "/transactions",
    {
      preHandler: auth,
      schema: {
        tags: ["transactions"],
        summary: "My recent transactions (newest first)",
        querystring: {
          type: "object",
          properties: { limit: { type: "integer", minimum: 1, maximum: 100 } },
        },
      },
    },
    async (request) => {
      const { limit } = request.query as { limit?: number };
      return c.listTransactions.execute(request.customerId, limit ?? 30);
    },
  );
}
