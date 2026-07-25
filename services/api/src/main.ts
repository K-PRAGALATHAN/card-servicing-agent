import { buildServer } from "./adapters/inbound/http/server";
import { loadConfig } from "./config/env";
import { buildContainer } from "./container";

async function main(): Promise<void> {
  const config = loadConfig();
  const container = await buildContainer(config);
  const app = await buildServer(container);

  await app.listen({ port: config.port, host: config.host });
  app.log.info(`card-servicing-api listening on ${config.host}:${config.port} (docs at /docs)`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
