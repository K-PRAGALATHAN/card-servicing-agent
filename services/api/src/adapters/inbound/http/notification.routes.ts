import type { FastifyInstance, preHandlerHookHandler } from "fastify";

import type { AppContainer } from "../../../container";

export function registerNotificationRoutes(
  app: FastifyInstance,
  c: AppContainer,
  auth: preHandlerHookHandler,
): void {
  app.get(
    "/notifications",
    { preHandler: auth, schema: { tags: ["notifications"], summary: "List my notifications" } },
    async (request) => c.listNotifications.execute(request.customerId),
  );

  app.get(
    "/notifications/search",
    {
      preHandler: auth,
      schema: {
        tags: ["notifications"],
        summary: "Search my notifications",
        querystring: {
          type: "object",
          required: ["q"],
          properties: { q: { type: "string", minLength: 1 } },
        },
      },
    },
    async (request) => {
      const { q } = request.query as { q: string };
      return c.searchNotifications.execute(request.customerId, q);
    },
  );
}
