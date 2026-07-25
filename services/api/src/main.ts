import { buildServer } from "./adapters/inbound/http/server";
import { loadConfig } from "./config/env";

async function main(): Promise<void> {
  const config = loadConfig();
  const app = buildServer();

  await app.listen({ port: config.port, host: config.host });
  app.log.info(`card-servicing-api listening on ${config.host}:${config.port}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
