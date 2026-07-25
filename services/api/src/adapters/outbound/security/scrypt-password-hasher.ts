import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

import type { PasswordHasher } from "../../../application/auth/password-hasher";

const KEY_LEN = 64;

function deriveKey(plain: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(plain, salt, KEY_LEN, (err, derived) => {
      if (err) reject(err);
      else resolve(derived);
    });
  });
}

/** scrypt-based hasher (`salt:hash` hex). No external dependency. */
export class ScryptPasswordHasher implements PasswordHasher {
  async hash(plain: string): Promise<string> {
    const salt = randomBytes(16);
    const derived = await deriveKey(plain, salt);
    return `${salt.toString("hex")}:${derived.toString("hex")}`;
  }

  async verify(plain: string, hash: string): Promise<boolean> {
    const [saltHex, keyHex] = hash.split(":");
    if (!saltHex || !keyHex) return false;
    const derived = await deriveKey(plain, Buffer.from(saltHex, "hex"));
    const expected = Buffer.from(keyHex, "hex");
    return derived.length === expected.length && timingSafeEqual(derived, expected);
  }
}
