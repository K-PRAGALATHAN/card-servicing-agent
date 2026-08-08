import type { Account } from "../../domain/account/account";
import type { AccountRepository } from "../../domain/account/account.repository";
import type { Card, CardTier } from "../../domain/card/card";
import type { CardRepository } from "../../domain/card/card.repository";
import { TIER_CATALOG } from "../../domain/card/tier-catalog";
import {
  ForbiddenError,
  InsufficientFundsError,
  NotFoundError,
  ValidationError,
} from "../../domain/shared/errors";
import { isGreaterOrEqual, money, subtractMoney } from "../../domain/shared/money";
import type { Transaction } from "../../domain/transaction/transaction";
import type { TransactionRepository } from "../../domain/transaction/transaction.repository";
import { makeLedgerEntry } from "../shared/ledger";
import { loadOwnedCard } from "./get-card.usecase";

export interface UpgradeCardInput {
  readonly customerId: string;
  readonly cardId: string;
  readonly tier: Exclude<CardTier, "Classic">;
  readonly fromAccountId: string; // where the joining fee is debited
}

export interface UpgradeReceipt {
  readonly card: Card;
  readonly account: Account;
  readonly feeMinor: number;
  readonly transaction: Transaction;
}

/**
 * Instantly upgrades a card to a new tier: raises its limits, debits the joining
 * fee from an account, and records the fee in the ledger. No paperwork — this is
 * a "pay now, upgrade now" demo flow.
 */
export class UpgradeCardUseCase {
  constructor(
    private readonly cards: CardRepository,
    private readonly accounts: AccountRepository,
    private readonly transactions: TransactionRepository,
  ) {}

  async execute(input: UpgradeCardInput): Promise<UpgradeReceipt> {
    const offer = TIER_CATALOG[input.tier];
    if (!offer) throw new ValidationError(`Unknown tier: ${input.tier}`);

    const card = await loadOwnedCard(this.cards, input.customerId, input.cardId);
    if (card.tier === input.tier) {
      throw new ValidationError(`Card is already ${input.tier}`);
    }
    if (card.status === "blocked") {
      throw new ValidationError("Blocked cards cannot be upgraded");
    }

    const account = await this.accounts.findById(input.fromAccountId);
    if (!account) throw new NotFoundError("Account", input.fromAccountId);
    if (account.customerId !== input.customerId) {
      throw new ForbiddenError("Account does not belong to customer");
    }

    const fee = money(offer.joiningFeeMinor, account.balance.currency);
    if (!isGreaterOrEqual(account.balance, fee)) throw new InsufficientFundsError();

    const updatedAccount: Account = { ...account, balance: subtractMoney(account.balance, fee) };
    await this.accounts.save(updatedAccount);

    const upgradedCard: Card = {
      ...card,
      tier: offer.tier,
      domesticLimit: money(offer.domesticLimitMinor),
      internationalLimit: money(offer.internationalLimitMinor),
      internationalEnabled: offer.internationalEnabled,
      availableLimit:
        card.type === "credit" ? money(offer.domesticLimitMinor) : card.availableLimit,
    };
    await this.cards.save(upgradedCard);

    const transaction = makeLedgerEntry({
      account: updatedAccount,
      direction: "debit",
      amount: fee,
      category: "card_upgrade",
      description: `${offer.name} card upgrade fee`,
      counterparty: offer.name,
      cardId: card.id,
    });
    await this.transactions.add(transaction);

    return {
      card: upgradedCard,
      account: updatedAccount,
      feeMinor: offer.joiningFeeMinor,
      transaction,
    };
  }
}
