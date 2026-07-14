import { Controller, Get, Inject } from "@nestjs/common";

import { API_INFO, type ApiInfo } from "../core/tokens.js";

@Controller("health")
export class HealthController {
  constructor(@Inject(API_INFO) private readonly info: ApiInfo) {}

  @Get()
  health(): { status: string; contractVersion: string } {
    return { status: "ok", contractVersion: this.info.contractVersion };
  }
}
