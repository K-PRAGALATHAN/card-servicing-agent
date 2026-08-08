import { LoginUseCase } from "./application/auth/login.usecase";
import type { TokenService } from "./application/auth/token.service";
import { ListAccountsUseCase } from "./application/account/list-accounts.usecase";
import { SelfTransferUseCase } from "./application/account/self-transfer.usecase";
import { GetCardUseCase } from "./application/card/get-card.usecase";
import { ListCardsUseCase } from "./application/card/list-cards.usecase";
import { SetCardFrozenUseCase } from "./application/card/set-card-frozen.usecase";
import { GetProfileUseCase } from "./application/customer/get-profile.usecase";
import { GetHealthUseCase } from "./application/health/get-health.usecase";
import { ListNotificationsUseCase } from "./application/notification/list-notifications.usecase";
import { SearchNotificationsUseCase } from "./application/notification/search-notifications.usecase";
import { CreateServicingRequestUseCase } from "./application/servicing/create-servicing-request.usecase";
import { ListServicingRequestsUseCase } from "./application/servicing/list-servicing-requests.usecase";
import { GetStatementUseCase } from "./application/statement/get-statement.usecase";
import { SystemHealthAdapter } from "./adapters/outbound/health/system-health.adapter";
import {
  InMemoryAccountRepository,
  InMemoryCardRepository,
  InMemoryCustomerRepository,
  InMemoryNotificationRepository,
  InMemoryServicingRequestRepository,
  InMemoryStatementProvider,
} from "./adapters/outbound/memory/in-memory-repositories";
import { buildSeed } from "./adapters/outbound/memory/seed";
import { JoseTokenService } from "./adapters/outbound/security/jose-token.service";
import { ScryptPasswordHasher } from "./adapters/outbound/security/scrypt-password-hasher";
import type { AccountRepository } from "./domain/account/account.repository";
import type { CardRepository } from "./domain/card/card.repository";
import type { CustomerRepository } from "./domain/customer/customer.repository";
import type { NotificationRepository } from "./domain/notification/notification.repository";
import type { ServicingRequestRepository } from "./domain/servicing/servicing-request.repository";
import type { StatementProvider } from "./domain/statement/statement.provider";
import type { AppConfig } from "./config/env";

interface Repositories {
  customers: CustomerRepository;
  accounts: AccountRepository;
  cards: CardRepository;
  statements: StatementProvider;
  servicing: ServicingRequestRepository;
  notifications: NotificationRepository;
}

/** Postgres (Prisma) when DATABASE_URL is set; seeded in-memory otherwise. */
async function buildRepositories(config: AppConfig): Promise<Repositories> {
  if (config.databaseUrl) {
    const { getPrismaClient } = await import("./adapters/outbound/prisma/prisma-client");
    const prisma = await import("./adapters/outbound/prisma/prisma-repositories");
    const client = getPrismaClient();
    return {
      customers: new prisma.PrismaCustomerRepository(client),
      accounts: new prisma.PrismaAccountRepository(client),
      cards: new prisma.PrismaCardRepository(client),
      statements: new prisma.PrismaStatementProvider(client),
      servicing: new prisma.PrismaServicingRequestRepository(client),
      notifications: new prisma.PrismaNotificationRepository(client),
    };
  }

  const seed = await buildSeed(new ScryptPasswordHasher());
  return {
    customers: new InMemoryCustomerRepository(seed.customers),
    accounts: new InMemoryAccountRepository(seed.accounts),
    cards: new InMemoryCardRepository(seed.cards),
    statements: new InMemoryStatementProvider(seed.statements),
    servicing: new InMemoryServicingRequestRepository(),
    notifications: new InMemoryNotificationRepository(seed.notifications),
  };
}

/** All use cases + the token service, wired to adapters. The HTTP layer reads this. */
export interface AppContainer {
  readonly tokenService: TokenService;
  readonly login: LoginUseCase;
  readonly getProfile: GetProfileUseCase;
  readonly listAccounts: ListAccountsUseCase;
  readonly selfTransfer: SelfTransferUseCase;
  readonly listCards: ListCardsUseCase;
  readonly getCard: GetCardUseCase;
  readonly setCardFrozen: SetCardFrozenUseCase;
  readonly getStatement: GetStatementUseCase;
  readonly createServicingRequest: CreateServicingRequestUseCase;
  readonly listServicingRequests: ListServicingRequestsUseCase;
  readonly listNotifications: ListNotificationsUseCase;
  readonly searchNotifications: SearchNotificationsUseCase;
  readonly health: GetHealthUseCase;
}

/**
 * Composition root. Uses Postgres (Prisma) when DATABASE_URL is set, and seeded
 * in-memory adapters otherwise (tests + offline dev) — swapping one for the other
 * touches nothing above this file.
 */
export async function buildContainer(config: AppConfig): Promise<AppContainer> {
  const hasher = new ScryptPasswordHasher();
  const { customers, accounts, cards, statements, servicing, notifications } =
    await buildRepositories(config);

  const tokenService = new JoseTokenService({
    secret: config.jwtSecret,
    accessTtl: config.accessTokenTtl,
    refreshTtl: config.refreshTokenTtl,
  });

  return {
    tokenService,
    login: new LoginUseCase(customers, hasher, tokenService),
    getProfile: new GetProfileUseCase(customers),
    listAccounts: new ListAccountsUseCase(accounts),
    selfTransfer: new SelfTransferUseCase(accounts),
    listCards: new ListCardsUseCase(cards),
    getCard: new GetCardUseCase(cards),
    setCardFrozen: new SetCardFrozenUseCase(cards),
    getStatement: new GetStatementUseCase(cards, statements),
    createServicingRequest: new CreateServicingRequestUseCase(servicing),
    listServicingRequests: new ListServicingRequestsUseCase(servicing),
    listNotifications: new ListNotificationsUseCase(notifications),
    searchNotifications: new SearchNotificationsUseCase(notifications),
    health: new GetHealthUseCase(new SystemHealthAdapter("card-servicing-api")),
  };
}
