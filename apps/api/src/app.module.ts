import { Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";

import { CommandsController } from "./commands/commands.controller.js";
import { AllExceptionsFilter } from "./common/all-exceptions.filter.js";
import { CoreModule } from "./core/core.module.js";
import { API_INFO, type ApiInfo } from "./core/tokens.js";
import { HealthController } from "./health/health.controller.js";
import { QueriesController } from "./queries/queries.controller.js";
import { RealtimeModule } from "./realtime/realtime.module.js";

@Module({
  imports: [CoreModule, RealtimeModule],
  controllers: [HealthController, CommandsController, QueriesController],
  providers: [
    {
      provide: API_INFO,
      useValue: { contractVersion: "v1" } satisfies ApiInfo,
    },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
