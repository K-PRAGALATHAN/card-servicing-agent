import type { Account } from "../../../domain/account/account";
import type { AccountRepository } from "../../../domain/account/account.repository";
import type { Card } from "../../../domain/card/card";
import type { CardRepository } from "../../../domain/card/card.repository";
import type { Customer } from "../../../domain/customer/customer";
import type { CustomerRepository } from "../../../domain/customer/customer.repository";
import type { Notification } from "../../../domain/notification/notification";
import type { NotificationRepository } from "../../../domain/notification/notification.repository";
import type { ServicingRequest } from "../../../domain/servicing/servicing-request";
import type { ServicingRequestRepository } from "../../../domain/servicing/servicing-request.repository";
import type { Statement } from "../../../domain/statement/statement";
import type { StatementProvider } from "../../../domain/statement/statement.provider";

export class InMemoryCustomerRepository implements CustomerRepository {
  constructor(private readonly byId: Map<string, Customer>) {}
  async findById(id: string): Promise<Customer | null> {
    return this.byId.get(id) ?? null;
  }
}

export class InMemoryAccountRepository implements AccountRepository {
  constructor(private readonly byId: Map<string, Account>) {}
  async listByCustomer(customerId: string): Promise<Account[]> {
    return [...this.byId.values()].filter((a) => a.customerId === customerId);
  }
  async findById(id: string): Promise<Account | null> {
    return this.byId.get(id) ?? null;
  }
  async save(account: Account): Promise<void> {
    this.byId.set(account.id, account);
  }
}

export class InMemoryCardRepository implements CardRepository {
  constructor(private readonly byId: Map<string, Card>) {}
  async listByCustomer(customerId: string): Promise<Card[]> {
    return [...this.byId.values()].filter((c) => c.customerId === customerId);
  }
  async findById(id: string): Promise<Card | null> {
    return this.byId.get(id) ?? null;
  }
  async save(card: Card): Promise<void> {
    this.byId.set(card.id, card);
  }
}

export class InMemoryStatementProvider implements StatementProvider {
  constructor(private readonly byCard: Map<string, Statement[]>) {}
  async listByCard(cardId: string): Promise<Statement[]> {
    return this.byCard.get(cardId) ?? [];
  }
  async latestForCard(cardId: string): Promise<Statement | null> {
    const list = this.byCard.get(cardId);
    return list && list.length > 0 ? (list[list.length - 1] ?? null) : null;
  }
}

export class InMemoryServicingRequestRepository implements ServicingRequestRepository {
  constructor(private readonly byId: Map<string, ServicingRequest> = new Map()) {}
  async create(request: ServicingRequest): Promise<void> {
    this.byId.set(request.id, request);
  }
  async listByCustomer(customerId: string): Promise<ServicingRequest[]> {
    return [...this.byId.values()].filter((r) => r.customerId === customerId);
  }
  async findById(id: string): Promise<ServicingRequest | null> {
    return this.byId.get(id) ?? null;
  }
}

export class InMemoryNotificationRepository implements NotificationRepository {
  constructor(private readonly items: Notification[]) {}
  async listByCustomer(customerId: string): Promise<Notification[]> {
    return this.items.filter((n) => n.customerId === customerId);
  }
  async search(customerId: string, query: string): Promise<Notification[]> {
    const q = query.toLowerCase();
    return this.items.filter(
      (n) =>
        n.customerId === customerId &&
        (n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q)),
    );
  }
}
