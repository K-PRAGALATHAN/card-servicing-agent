import type { Notification } from "../../domain/notification/notification";
import type { NotificationRepository } from "../../domain/notification/notification.repository";
import { ValidationError } from "../../domain/shared/errors";

export class SearchNotificationsUseCase {
  constructor(private readonly notifications: NotificationRepository) {}

  async execute(customerId: string, query: string): Promise<Notification[]> {
    const trimmed = query.trim();
    if (trimmed.length === 0) {
      throw new ValidationError("Search query must not be empty");
    }
    return this.notifications.search(customerId, trimmed);
  }
}
