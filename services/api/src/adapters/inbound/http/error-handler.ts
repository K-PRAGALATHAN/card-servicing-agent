import type { FastifyError, FastifyInstance } from "fastify";

import { DomainError, type DomainErrorCode } from "../../../domain/shared/errors";

const STATUS: Record<DomainErrorCode, number> = {
  not_found: 404,
  validation: 400,
  unauthorized: 401,
  forbidden: 403,
  conflict: 409,
  insufficient_funds: 422,
};

/** Maps domain errors and Fastify validation errors to clean JSON responses. */
export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (error instanceof DomainError) {
      reply.status(STATUS[error.code]).send({ error: error.code, message: error.message });
      return;
    }
    if (error.validation) {
      reply.status(400).send({ error: "validation", message: error.message });
      return;
    }
    request.log.error(error);
    reply.status(500).send({ error: "internal", message: "Internal server error" });
  });
}
