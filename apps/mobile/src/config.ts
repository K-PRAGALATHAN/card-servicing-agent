import Constants from "expo-constants";

/**
 * Derive the dev machine's host from Expo so a physical device (Expo Go) can
 * reach the local API/agent over the LAN automatically. Falls back to
 * localhost (iOS simulator). For an Android emulator use 10.0.2.2.
 */
const host = Constants.expoConfig?.hostUri?.split(":")[0] ?? "localhost";

export const API_BASE = `http://${host}:4000`;
export const AGENT_BASE = `http://${host}:8000`;

/** Seeded demo customer (matches services/api). */
export const DEMO_CUSTOMER_ID = "NB00482193";
export const DEMO_PASSWORD = "password123";
