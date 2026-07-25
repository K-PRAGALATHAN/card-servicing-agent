import type { ServicingRequest } from "../../domain/servicing/servicing-request";
import type { ServicingRequestRepository } from "../../domain/servicing/servicing-request.repository";

export class ListServicingRequestsUseCase {
  constructor(private readonly requests: ServicingRequestRepository) {}

  async execute(customerId: string): Promise<ServicingRequest[]> {
    return this.requests.listByCustomer(customerId);
  }
}
