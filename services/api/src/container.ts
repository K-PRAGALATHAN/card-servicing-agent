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
import type { AppConfig } from "./config/env";

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
 * Composition root. Phase 1 uses seeded in-memory adapters (exit criterion:
 * read APIs return seeded data). Postgres/Mongo adapters replace these later
 * behind the same ports — nothing above this file changes.
 */
export async function buildContainer(config: AppConfig): Promise<AppContainer> {
  const hasher = new ScryptPasswordHasher();
  const seed = await buildSeed(hasher);

  const customers = new InMemoryCustomerRepository(seed.customers);
  const accounts = new InMemoryAccountRepository(seed.accounts);
  const cards = new InMemoryCardRepository(seed.cards);
  const statements = new InMemoryStatementProvider(seed.statements);
  const servicing = new InMemoryServicingRequestRepository();
  const notifications = new InMemoryNotificationRepository(seed.notifications);

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
