import type { FastifyInstance } from "fastify";

import type { AppContainer } from "../../../container";

export function registerAuthRoutes(app: FastifyInstance, c: AppContainer): void {
  app.post(
    "/auth/login",
    {
      schema: {
        tags: ["auth"],
        summary: "Login with customer ID and password",
        body: {
          type: "object",
          required: ["customerId", "password"],
          properties: {
            customerId: { type: "string" },
            password: { type: "string" },
          },
        },
      },
    },
    async (request) => {
      const { customerId, password } = request.body as { customerId: string; password: string };
      return c.login.execute(customerId, password);
    },
  );

  app.post(
    "/auth/refresh",
    {
      schema: {
        tags: ["auth"],
        summary: "Exchange a refresh token for new tokens",
        body: {
          type: "object",
          required: ["refreshToken"],
          properties: { refreshToken: { type: "string" } },
        },
      },
    },
    async (request) => {
      const { refreshToken } = request.body as { refreshToken: string };
      return c.tokenService.refresh(refreshToken);
    },
  );

  app.post(
    "/auth/logout",
    { schema: { tags: ["auth"], summary: "Logout (client discards tokens; access expires fast)" } },
    async () => ({ ok: true }),
  );
}
