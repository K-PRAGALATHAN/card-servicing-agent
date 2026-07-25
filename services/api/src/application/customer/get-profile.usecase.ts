import type { CustomerRepository } from "../../domain/customer/customer.repository";
import type { KycDetails } from "../../domain/customer/customer";
import { NotFoundError } from "../../domain/shared/errors";

/** Customer profile without secrets (no password hash leaves this boundary). */
export interface ProfileView {
  readonly id: string;
  readonly fullName: string;
  readonly email: string;
  readonly phone: string;
  readonly address: string;
  readonly kyc: KycDetails;
}

export class GetProfileUseCase {
  constructor(private readonly customers: CustomerRepository) {}

  async execute(customerId: string): Promise<ProfileView> {
    const customer = await this.customers.findById(customerId);
    if (!customer) {
      throw new NotFoundError("Customer", customerId);
    }
    const { passwordHash: _passwordHash, ...profile } = customer;
    return profile;
  }
}
