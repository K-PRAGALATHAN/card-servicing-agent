import type { FastifyInstance, preHandlerHookHandler } from "fastify";

import type { AppContainer } from "../../../container";

export function registerPaymentRoutes(
  app: FastifyInstance,
  c: AppContainer,
  auth: preHandlerHookHandler,
): void {
  app.post(
    "/payments/pay",
    {
      preHandler: auth,
      schema: {
        tags: ["payments"],
        summary: "Pay a bill or recharge from an account",
        body: {
          type: "object",
          required: ["fromAccountId", "category", "biller", "amountMinor"],
          properties: {
            fromAccountId: { type: "string" },
            category: { type: "string", enum: ["bill", "recharge"] },
            biller: { type: "string" },
            reference: { type: "string" },
            amountMinor: { type: "integer", minimum: 1 },
          },
        },
      },
    },
    async (request) => {
      const body = request.body as {
        fromAccountId: string;
        category: "bill" | "recharge";
        biller: string;
        reference?: string;
        amountMinor: number;
      };
      return c.payBill.execute({ customerId: request.customerId, ...body });
    },
  );
}
