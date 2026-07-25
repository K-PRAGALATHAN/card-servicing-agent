import type { FastifyInstance, preHandlerHookHandler } from "fastify";

import type { ServicingType } from "../../../domain/servicing/servicing-request";
import type { AppContainer } from "../../../container";

const SERVICING_TYPES: ServicingType[] = [
  "fee_reversal",
  "credit_limit_increase",
  "card_replacement",
  "freeze_card",
  "unfreeze_card",
  "autopay_setup",
  "payment_date_change",
  "contact_update",
  "dispute",
  "report_fraud",
];

export function registerServicingRoutes(
  app: FastifyInstance,
  c: AppContainer,
  auth: preHandlerHookHandler,
): void {
  app.post(
    "/servicing/requests",
    {
      preHandler: auth,
      schema: {
        tags: ["servicing"],
        summary: "Create a servicing request (ungated; policy decides in Phase 2)",
        body: {
          type: "object",
          required: ["type"],
          properties: {
            type: { type: "string", enum: SERVICING_TYPES },
            cardId: { type: "string" },
            details: { type: "object", additionalProperties: true },
          },
        },
      },
    },
    async (request, reply) => {
      const body = request.body as {
        type: ServicingType;
        cardId?: string;
        details?: Record<string, unknown>;
      };
      const created = await c.createServicingRequest.execute({
        customerId: request.customerId,
        ...body,
      });
      reply.status(201);
      return created;
    },
  );

  app.get(
    "/servicing/requests",
    { preHandler: auth, schema: { tags: ["servicing"], summary: "List my servicing requests" } },
    async (request) => c.listServicingRequests.execute(request.customerId),
  );

  // Convenience endpoints mirroring the Cards screen actions.
  app.post(
    "/cards/:id/dispute",
    { preHandler: auth, schema: { tags: ["servicing"], summary: "Raise a dispute on a card" } },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = (request.body ?? {}) as { details?: Record<string, unknown> };
      const created = await c.createServicingRequest.execute({
        customerId: request.customerId,
        type: "dispute",
        cardId: id,
        ...(body.details ? { details: body.details } : {}),
      });
      reply.status(201);
      return created;
    },
  );

  app.post(
    "/cards/:id/report-fraud",
    { preHandler: auth, schema: { tags: ["servicing"], summary: "Report fraud on a card" } },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = (request.body ?? {}) as { details?: Record<string, unknown> };
      const created = await c.createServicingRequest.execute({
        customerId: request.customerId,
        type: "report_fraud",
        cardId: id,
        ...(body.details ? { details: body.details } : {}),
      });
      reply.status(201);
      return created;
    },
  );
}
