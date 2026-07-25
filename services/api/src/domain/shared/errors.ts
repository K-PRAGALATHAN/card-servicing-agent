/** Stable machine-readable codes; the HTTP layer maps these to status codes. */
export type DomainErrorCode =
  "not_found" | "validation" | "unauthorized" | "forbidden" | "conflict" | "insufficient_funds";

export class DomainError extends Error {
  constructor(
    message: string,
    readonly code: DomainErrorCode,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends DomainError {
  constructor(entity: string, id: string) {
    super(`${entity} '${id}' not found`, "not_found");
  }
}

export class ValidationError extends DomainError {
  constructor(message: string) {
    super(message, "validation");
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message = "Unauthorized") {
    super(message, "unauthorized");
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = "Forbidden") {
    super(message, "forbidden");
  }
}

export class InsufficientFundsError extends DomainError {
  constructor(message = "Insufficient funds") {
    super(message, "insufficient_funds");
  }
}
