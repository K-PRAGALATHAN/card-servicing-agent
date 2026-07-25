import type { Notification } from "./notification";

export interface NotificationRepository {
  listByCustomer(customerId: string): Promise<Notification[]>;
  /** Case-insensitive match over title/body for the customer's notifications. */
  search(customerId: string, query: string): Promise<Notification[]>;
}
