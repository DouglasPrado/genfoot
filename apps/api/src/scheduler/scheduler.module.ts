import { Module } from "@nestjs/common";

import { CoreModule } from "../core/core.module.js";

import { WorldSchedulerService } from "./world-scheduler.service.js";

/**
 * O scheduler do mundo (MUNDO-V3): o loop que faz o mundo andar sozinho.
 * Consome os repositórios do CoreModule.
 */
@Module({
  imports: [CoreModule],
  providers: [WorldSchedulerService],
})
export class SchedulerModule {}
