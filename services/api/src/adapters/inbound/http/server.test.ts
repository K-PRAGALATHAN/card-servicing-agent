import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { loadConfig } from "../../../config/env";
import { buildContainer } from "../../../container";
import { DEMO_CUSTOMER_ID, DEMO_PASSWORD } from "../../outbound/memory/seed";
import { buildServer } from "./server";

let app: FastifyInstance;
let token: string;

beforeAll(async () => {
  const container = await buildContainer({ ...loadConfig(), jwtSecret: "test-secret" });
  app = await buildServer(container);
  await app.ready();

  const res = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { customerId: DEMO_CUSTOMER_ID, password: DEMO_PASSWORD },
  });
  token = res.json<{ accessToken: string }>().accessToken;
});

afterAll(async () => {
  await app.close();
});

function auth() {
  return { authorization: `Bearer ${token}` };
}

describe("auth", () => {
  it("issues an access token on valid login", () => {
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(10);
  });

  it("rejects invalid credentials with 401", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { customerId: DEMO_CUSTOMER_ID, password: "wrong" },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe("auth guard", () => {
  it("blocks unauthenticated access with 401", async () => {
    const res = await app.inject({ method: "GET", url: "/accounts" });
    expect(res.statusCode).toBe(401);
  });
});

describe("read APIs (seeded)", () => {
  it("returns the customer's accounts", async () => {
    const res = await app.inject({ method: "GET", url: "/accounts", headers: auth() });
    expect(res.statusCode).toBe(200);
    expect(res.json<unknown[]>()).toHaveLength(2);
  });

  it("returns the customer's cards", async () => {
    const res = await app.inject({ method: "GET", url: "/cards", headers: auth() });
    expect(res.statusCode).toBe(200);
    expect(res.json<unknown[]>()).toHaveLength(2);
  });

  it("returns profile incl. KYC but never the password hash", async () => {
    const res = await app.inject({ method: "GET", url: "/me", headers: auth() });
    expect(res.statusCode).toBe(200);
    const body = res.json<Record<string, unknown>>();
    expect(body.kyc).toBeDefined();
    expect(body.passwordHash).toBeUndefined();
  });

  it("searches notifications", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/notifications/search?q=fee",
      headers: auth(),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json<unknown[]>().length).toBeGreaterThan(0);
  });
});

describe("card servicing", () => {
  it("freezes a card", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/cards/card_credit_1/freeze",
      headers: auth(),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ status: string }>().status).toBe("frozen");
  });

  it("creates a servicing request as pending/high", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/servicing/requests",
      headers: auth(),
      payload: { type: "fee_reversal" },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json<{ status: string; priority: string }>();
    expect(body.status).toBe("pending");
    expect(body.priority).toBe("high");
  });
});

describe("self-transfer", () => {
  it("moves funds between owned accounts", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/accounts/transfer",
      headers: auth(),
      payload: { fromAccountId: "acc_savings_1", toAccountId: "acc_salary_1", amountMinor: 100000 },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ amountMinor: number }>().amountMinor).toBe(100000);
  });

  it("rejects an over-balance transfer with 422", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/accounts/transfer",
      headers: auth(),
      payload: {
        fromAccountId: "acc_salary_1",
        toAccountId: "acc_savings_1",
        amountMinor: 999_999_999,
      },
    });
    expect(res.statusCode).toBe(422);
  });
});

describe("openapi", () => {
  it("publishes the OpenAPI spec", async () => {
    const res = await app.inject({ method: "GET", url: "/docs/json" });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ openapi?: string }>().openapi).toBeDefined();
  });
});
