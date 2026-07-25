import type { FastifyInstance, preHandlerHookHandler } from "fastify";

import type { AppContainer } from "../../../container";

export function registerStatementRoutes(
  app: FastifyInstance,
  c: AppContainer,
  auth: preHandlerHookHandler,
): void {
  app.get(
    "/cards/:id/statement",
    {
      preHandler: auth,
      schema: {
        tags: ["statements"],
        summary: "Latest statement for a card",
        params: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
      },
    },
    async (request) => {
      const { id } = request.params as { id: string };
      return c.getStatement.execute(request.customerId, id);
    },
  );
}
