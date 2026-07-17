import { Module } from "@nestjs/common";

import { CoreModule } from "../core/core.module.js";
import { SESSION_STORE } from "../core/tokens.js";
import { AuthController } from "./auth.controller.js";
import { SessionStore } from "./session-store.js";

@Module({
  // `CoreModule` traz o `USER_ACCOUNT_REPOSITORY`: o /auth/session resolve a
  // conta do jogo a partir do subject verificado (R-171/R-172).
  imports: [CoreModule],
  controllers: [AuthController],
  providers: [{ provide: SESSION_STORE, useFactory: () => new SessionStore() }],
  exports: [SESSION_STORE],
})
export class AuthModule {}
