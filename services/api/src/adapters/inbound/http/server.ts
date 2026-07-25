import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import Fastify, { type FastifyInstance } from "fastify";

import type { AppContainer } from "../../../container";
import { registerAccountRoutes } from "./account.routes";
import { registerAuthRoutes } from "./auth.routes";
import { registerCardRoutes } from "./card.routes";
import { registerErrorHandler } from "./error-handler";
import { registerHealthRoutes } from "./health.routes";
import { registerNotificationRoutes } from "./notification.routes";
import { makeAuthGuard } from "./plugins/auth";
import { registerProfileRoutes } from "./profile.routes";
import { registerServicingRoutes } from "./servicing.routes";
import { registerStatementRoutes } from "./statement.routes";

/**
 * HTTP composition root: OpenAPI, error handling, auth guard, and all routes.
 * The domain is reached only through the container's use cases.
 */
export async function buildServer(container: AppContainer): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });

  await app.register(swagger, {
    openapi: {
      info: { title: "Card Servicing API", version: "0.1.0" },
      tags: [
        { name: "auth" },
        { name: "customer" },
        { name: "accounts" },
        { name: "cards" },
        { name: "statements" },
        { name: "servicing" },
        { name: "notifications" },
        { name: "health" },
      ],
      components: {
        securitySchemes: {
          bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
        },
      },
    },
  });
  await app.register(swaggerUi, { routePrefix: "/docs" });

  app.decorateRequest("customerId", "");
  registerErrorHandler(app);

  const auth = makeAuthGuard(container.tokenService);

  registerHealthRoutes(app, container.health);
  registerAuthRoutes(app, container);
  registerProfileRoutes(app, container, auth);
  registerAccountRoutes(app, container, auth);
  registerCardRoutes(app, container, auth);
  registerStatementRoutes(app, container, auth);
  registerServicingRoutes(app, container, auth);
  registerNotificationRoutes(app, container, auth);

  return app;
}
