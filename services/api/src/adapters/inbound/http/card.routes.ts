import type { FastifyInstance, preHandlerHookHandler } from "fastify";

import type { AppContainer } from "../../../container";

const idParam = {
  type: "object",
  required: ["id"],
  properties: { id: { type: "string" } },
} as const;

export function registerCardRoutes(
  app: FastifyInstance,
  c: AppContainer,
  auth: preHandlerHookHandler,
): void {
  app.get(
    "/cards",
    { preHandler: auth, schema: { tags: ["cards"], summary: "List my cards" } },
    async (request) => c.listCards.execute(request.customerId),
  );

  app.get(
    "/cards/:id",
    { preHandler: auth, schema: { tags: ["cards"], summary: "Get card details", params: idParam } },
    async (request) => {
      const { id } = request.params as { id: string };
      return c.getCard.execute(request.customerId, id);
    },
  );

  app.post(
    "/cards/:id/freeze",
    { preHandler: auth, schema: { tags: ["cards"], summary: "Freeze a card", params: idParam } },
    async (request) => {
      const { id } = request.params as { id: string };
      return c.setCardFrozen.execute(request.customerId, id, true);
    },
  );

  app.post(
    "/cards/:id/unfreeze",
    { preHandler: auth, schema: { tags: ["cards"], summary: "Unfreeze a card", params: idParam } },
    async (request) => {
      const { id } = request.params as { id: string };
      return c.setCardFrozen.execute(request.customerId, id, false);
    },
  );
}
