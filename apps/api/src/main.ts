import "reflect-metadata";

import { NestFactory } from "@nestjs/core";
import type { INestApplication } from "@nestjs/common";

import { AppModule } from "./app.module.js";

export const API_PREFIX = "api/v1";

/** Cria o app Nest sem escutar porta (reusado por testes e2e). */
export async function createApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix(API_PREFIX);
  return app;
}

export async function bootstrap(port: number): Promise<void> {
  const app = await createApp();
  await app.listen(port);
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  import.meta.url === `file://${process.argv[1]}`;
if (invokedDirectly) {
  void bootstrap(Number(process.env.PORT ?? 3000));
}
