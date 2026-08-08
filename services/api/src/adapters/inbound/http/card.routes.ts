import type { FastifyInstance, preHandlerHookHandler } from "fastify";

import type { AppContainer } from "../../../container";
import { TIER_CATALOG } from "../../../domain/card/tier-catalog";

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

  app.post(
    "/cards/:id/limits",
    {
      preHandler: auth,
      schema: {
        tags: ["cards"],
        summary: "Set domestic & international spend limits",
        params: idParam,
        body: {
          type: "object",
          properties: {
            domesticLimitMinor: { type: "integer", minimum: 0 },
            internationalLimitMinor: { type: "integer", minimum: 0 },
            internationalEnabled: { type: "boolean" },
          },
        },
      },
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const body = request.body as {
        domesticLimitMinor?: number;
        internationalLimitMinor?: number;
        internationalEnabled?: boolean;
      };
      return c.setCardLimits.execute(request.customerId, id, body);
    },
  );

  app.post(
    "/cards/:id/reset-pin",
    {
      preHandler: auth,
      schema: {
        tags: ["cards"],
        summary: "Reset the card ATM PIN",
        params: idParam,
        body: {
          type: "object",
          required: ["pin"],
          properties: { pin: { type: "string" } },
        },
      },
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const { pin } = request.body as { pin: string };
      return c.resetCardPin.execute(request.customerId, id, pin);
    },
  );

  app.get(
    "/cards/upgrade-offers",
    { preHandler: auth, schema: { tags: ["cards"], summary: "Available card upgrade tiers" } },
    async () => Object.values(TIER_CATALOG),
  );

  app.post(
    "/cards/:id/upgrade",
    {
      preHandler: auth,
      schema: {
        tags: ["cards"],
        summary: "Upgrade a card tier (debits the joining fee)",
        params: idParam,
        body: {
          type: "object",
          required: ["tier", "fromAccountId"],
          properties: {
            tier: { type: "string", enum: ["Platinum", "Millennia", "Business"] },
            fromAccountId: { type: "string" },
          },
        },
      },
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const body = request.body as {
        tier: "Platinum" | "Millennia" | "Business";
        fromAccountId: string;
      };
      return c.upgradeCard.execute({ customerId: request.customerId, cardId: id, ...body });
    },
  );

  // ── Servicing execution (policy-approved by the agent, then applied here) ──
  app.post(
    "/cards/:id/reverse-fee",
    {
      preHandler: auth,
      schema: {
        tags: ["cards"],
        summary: "Reverse a fee — credits the customer's account",
        params: idParam,
        body: {
          type: "object",
          required: ["feeAmountMinor"],
          properties: { feeAmountMinor: { type: "integer", minimum: 1 } },
        },
      },
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const { feeAmountMinor } = request.body as { feeAmountMinor: number };
      return c.reverseFee.execute({ customerId: request.customerId, cardId: id, feeAmountMinor });
    },
  );

  app.post(
    "/cards/:id/credit-limit",
    {
      preHandler: auth,
      schema: {
        tags: ["cards"],
        summary: "Modify a credit card's limit",
        params: idParam,
        body: {
          type: "object",
          required: ["newLimitMinor"],
          properties: { newLimitMinor: { type: "integer", minimum: 1 } },
        },
      },
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const { newLimitMinor } = request.body as { newLimitMinor: number };
      return c.modifyCreditLimit.execute({
        customerId: request.customerId,
        cardId: id,
        newLimitMinor,
      });
    },
  );

  app.post(
    "/cards/:id/replace",
    {
      preHandler: auth,
      schema: {
        tags: ["cards"],
        summary: "Replace a card — blocks the old one, issues a new one",
        params: idParam,
        body: {
          type: "object",
          properties: { reason: { type: "string" } },
        },
      },
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const body = (request.body ?? {}) as { reason?: string };
      return c.replaceCard.execute({
        customerId: request.customerId,
        cardId: id,
        reason: body.reason,
      });
    },
  );
}
