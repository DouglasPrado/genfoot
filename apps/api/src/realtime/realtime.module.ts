import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.js";
import { REALTIME_PUBLISHER } from "../core/tokens.js";
import { RealtimeGateway } from "./realtime.gateway.js";

@Module({
  imports: [AuthModule],
  providers: [
    RealtimeGateway,
    { provide: REALTIME_PUBLISHER, useExisting: RealtimeGateway },
  ],
  exports: [REALTIME_PUBLISHER],
})
export class RealtimeModule {}
