import "reflect-metadata";

import { NestFactory } from "@nestjs/core";
import type { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

import { AppModule } from "./app.module.js";

export const API_PREFIX = "api/v1";

/** Cria o app Nest sem escutar porta (reusado por testes e2e). */
export async function createApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix(API_PREFIX);
  if (process.env.GRINTA_API_LOG_REQUESTS === "1") {
    const instance = app.getHttpAdapter().getInstance() as {
      use: (fn: (req: unknown, res: unknown, next: () => void) => void) => void;
    };
    instance.use((req, _res, next) => {
      const r = req as { method?: string; originalUrl?: string; headers?: Record<string, string> };
      // eslint-disable-next-line no-console
      console.log(
        `[req] ${r.method} ${r.originalUrl} origin=${r.headers?.origin ?? "-"}`,
      );
      next();
    });
  }
  // Clientes (admin Next.js, mobile Expo) rodam em outra origem.
  app.enableCors({
    origin: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["content-type", "authorization", "x-correlation-id"],
  });
  return app;
}

/** Publica o Swagger/OpenAPI em /docs (JSON em /docs-json). */
export function configureSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle("Grinta API")
    .setDescription(
      "API oficial do Grinta (X-003). Clientes não-autoritativos consomem " +
        "commands, queries e realtime versionados. Domínio em @grinta/core.",
    )
    .setVersion("v1")
    .addBearerAuth()
    .addTag("health", "Saúde e versão de contrato")
    .addTag("auth", "Emissão de sessão (Bearer token)")
    .addTag("commands", "Command endpoint (envelope idempotente)")
    .addTag("queries", "Queries versionadas (envelope asOf/projectionVersion)")
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, document, {
    jsonDocumentUrl: "docs-json",
  });
}

export async function bootstrap(port: number): Promise<void> {
  const app = await createApp();
  configureSwagger(app);
  await app.listen(port);
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  import.meta.url === `file://${process.argv[1]}`;
if (invokedDirectly) {
  void bootstrap(Number(process.env.PORT ?? 3000));
}
