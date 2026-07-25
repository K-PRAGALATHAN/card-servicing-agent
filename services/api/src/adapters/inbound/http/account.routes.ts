import type { FastifyInstance, preHandlerHookHandler } from "fastify";

import type { AppContainer } from "../../../container";

export function registerAccountRoutes(
  app: FastifyInstance,
  c: AppContainer,
  auth: preHandlerHookHandler,
): void {
  app.get(
    "/accounts",
    { preHandler: auth, schema: { tags: ["accounts"], summary: "List my accounts" } },
    async (request) => c.listAccounts.execute(request.customerId),
  );

  app.post(
    "/accounts/transfer",
    {
      preHandler: auth,
      schema: {
        tags: ["accounts"],
        summary: "Self-transfer between my accounts",
        body: {
          type: "object",
          required: ["fromAccountId", "toAccountId", "amountMinor"],
          properties: {
            fromAccountId: { type: "string" },
            toAccountId: { type: "string" },
            amountMinor: { type: "integer", minimum: 1 },
          },
        },
      },
    },
    async (request) => {
      const body = request.body as {
        fromAccountId: string;
        toAccountId: string;
        amountMinor: number;
      };
      return c.selfTransfer.execute({ customerId: request.customerId, ...body });
    },
  );
}
