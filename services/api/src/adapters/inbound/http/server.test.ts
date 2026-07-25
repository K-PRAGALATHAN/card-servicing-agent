import { describe, expect, it } from "vitest";

import { buildServer } from "./server";

describe("GET /health", () => {
  it("flows domain -> port -> adapter -> HTTP and returns 200 healthy", async () => {
    const app = buildServer();

    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    const body = response.json() as { service: string; state: string };
    expect(body.service).toBe("card-servicing-api");
    expect(body.state).toBe("healthy");

    await app.close();
  });
});
