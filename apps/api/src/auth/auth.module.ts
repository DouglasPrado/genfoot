import { Module } from "@nestjs/common";

import { SESSION_STORE } from "../core/tokens.js";
import { AuthController } from "./auth.controller.js";
import { SessionStore } from "./session-store.js";

@Module({
  controllers: [AuthController],
  providers: [{ provide: SESSION_STORE, useFactory: () => new SessionStore() }],
  exports: [SESSION_STORE],
})
export class AuthModule {}
