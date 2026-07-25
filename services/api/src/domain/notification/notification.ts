export type NotificationCategory = "transaction" | "security" | "servicing" | "promo";

export interface Notification {
  readonly id: string;
  readonly customerId: string;
  readonly title: string;
  readonly body: string;
  readonly category: NotificationCategory;
  readonly read: boolean;
  readonly createdAt: string; // ISO
}
