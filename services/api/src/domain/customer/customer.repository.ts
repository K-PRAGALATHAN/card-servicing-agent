import type { Customer } from "./customer";

export interface CustomerRepository {
  findById(id: string): Promise<Customer | null>;
}
