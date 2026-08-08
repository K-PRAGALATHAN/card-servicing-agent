import { describe, expect, it } from "vitest";

import { InMemoryCustomerRepository } from "../../adapters/outbound/memory/in-memory-repositories";
import { JoseTokenService } from "../../adapters/outbound/security/jose-token.service";
import { ScryptPasswordHasher } from "../../adapters/outbound/security/scrypt-password-hasher";
import type { Customer } from "../../domain/customer/customer";
import { UnauthorizedError } from "../../domain/shared/errors";
import { LoginUseCase } from "./login.usecase";

async function setup(): Promise<LoginUseCase> {
  const hasher = new ScryptPasswordHasher();
  const passwordHash = await hasher.hash("s3cret");
  const customer: Customer = {
    id: "c1",
    fullName: "A",
    email: "a@b.c",
    phone: "x",
    address: "y",
    passwordHash,
    kyc: { panMasked: "", aadhaarMasked: "", status: "verified" },
    creditScore: 750,
  };
  const customers = new InMemoryCustomerRepository(new Map([[customer.id, customer]]));
  const tokens = new JoseTokenService({ secret: "t", accessTtl: "5m", refreshTtl: "1d" });
  return new LoginUseCase(customers, hasher, tokens);
}

describe("LoginUseCase", () => {
  it("issues tokens on valid credentials", async () => {
    const login = await setup();
    const result = await login.execute("c1", "s3cret");
    expect(result.accessToken).toBeTruthy();
    expect(result.expiresInSeconds).toBeGreaterThan(0);
  });

  it("throws on a wrong password", async () => {
    const login = await setup();
    await expect(login.execute("c1", "nope")).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("throws on an unknown customer", async () => {
    const login = await setup();
    await expect(login.execute("zzz", "s3cret")).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
