import { randomUUID } from "node:crypto";

/** Prefixed, human-readable identifiers, e.g. `acc_1a2b...`. */
export function newId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}
