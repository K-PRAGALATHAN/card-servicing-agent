import type { Card } from "./card";

export interface CardRepository {
  listByCustomer(customerId: string): Promise<Card[]>;
  findById(id: string): Promise<Card | null>;
  save(card: Card): Promise<void>;
}
