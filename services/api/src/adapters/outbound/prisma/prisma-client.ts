import { PrismaClient } from "@prisma/client";

let client: PrismaClient | null = null;

/** Lazy singleton so we open one connection pool per process. */
export function getPrismaClient(): PrismaClient {
  if (!client) {
    client = new PrismaClient();
  }
  return client;
}
