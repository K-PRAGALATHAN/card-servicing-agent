import type { CustomerRepository } from "../../domain/customer/customer.repository";
import { UnauthorizedError } from "../../domain/shared/errors";
import type { PasswordHasher } from "./password-hasher";
import type { AuthTokens, TokenService } from "./token.service";

/** Authenticates by customer ID + password and issues tokens (fast-expiry access). */
export class LoginUseCase {
  constructor(
    private readonly customers: CustomerRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService,
  ) {}

  async execute(customerId: string, password: string): Promise<AuthTokens> {
    const customer = await this.customers.findById(customerId);
    // Same error whether the customer is missing or the password is wrong.
    if (!customer || !(await this.hasher.verify(password, customer.passwordHash))) {
      throw new UnauthorizedError("Invalid credentials");
    }
    return this.tokens.issue(customer.id);
  }
}
