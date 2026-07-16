/**
 * Tokens de injeção explícitos. Usamos tokens (não injeção por tipo/metadados)
 * para que a DI funcione tanto no build `tsc` quanto sob o vitest/esbuild, que
 * não emite `emitDecoratorMetadata`.
 */
export const API_INFO = "API_INFO";
/**
 * As 15 portas que ainda são JSON. Condenado (R-173): some quando o último
 * contexto migrar. NÃO tem mais a porta do mundo — o mundo é tabela, sempre.
 */
export const WORLD_REPOSITORY = "WORLD_REPOSITORY";
/** O mundo, no Postgres (R-173/R-182). Raiz de tudo: quase todo agregado pendura nele. */
export const GAME_WORLD_REPOSITORY = "GAME_WORLD_REPOSITORY";
export const IDEMPOTENCY_STORE = "IDEMPOTENCY_STORE";
export const REALTIME_PUBLISHER = "REALTIME_PUBLISHER";
export const SESSION_STORE = "SESSION_STORE";
/**
 * Escopo transacional de C1 (R-175). Único caminho de escrita da identidade:
 * agregado e evento no mesmo commit (Decisão 19.10).
 */
export const IDENTITY_UNIT_OF_WORK = "IDENTITY_UNIT_OF_WORK";
/** Leitura de C1: fora do UnitOfWork — query não abre transação. */
export const IDENTITY_READ_MODEL = "IDENTITY_READ_MODEL";

export interface ApiInfo {
  readonly contractVersion: string;
}
