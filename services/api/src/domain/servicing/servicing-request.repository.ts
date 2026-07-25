import type { ServicingRequest } from "./servicing-request";

export interface ServicingRequestRepository {
  create(request: ServicingRequest): Promise<void>;
  listByCustomer(customerId: string): Promise<ServicingRequest[]>;
  findById(id: string): Promise<ServicingRequest | null>;
}
