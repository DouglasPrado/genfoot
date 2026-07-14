import { Controller, Get, Inject } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { API_INFO, type ApiInfo } from "../core/tokens.js";
import { Public } from "../auth/public.decorator.js";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(@Inject(API_INFO) private readonly info: ApiInfo) {}

  @ApiOperation({ summary: "Saúde e versão de contrato" })
  @Public()
  @Get()
  health(): { status: string; contractVersion: string } {
    return { status: "ok", contractVersion: this.info.contractVersion };
  }
}
