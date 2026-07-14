import { Module } from "@nestjs/common";

import { REALTIME_PUBLISHER } from "../core/tokens.js";
import { RealtimeGateway } from "./realtime.gateway.js";

@Module({
  providers: [
    RealtimeGateway,
    { provide: REALTIME_PUBLISHER, useExisting: RealtimeGateway },
  ],
  exports: [REALTIME_PUBLISHER],
})
export class RealtimeModule {}
