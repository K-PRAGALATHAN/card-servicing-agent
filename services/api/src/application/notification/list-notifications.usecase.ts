import type { Notification } from "../../domain/notification/notification";
import type { NotificationRepository } from "../../domain/notification/notification.repository";

export class ListNotificationsUseCase {
  constructor(private readonly notifications: NotificationRepository) {}

  async execute(customerId: string): Promise<Notification[]> {
    return this.notifications.listByCustomer(customerId);
  }
}
