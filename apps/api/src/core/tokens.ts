/**
 * Tokens de injeção explícitos. Usamos tokens (não injeção por tipo/metadados)
 * para que a DI funcione tanto no build `tsc` quanto sob o vitest/esbuild, que
 * não emite `emitDecoratorMetadata`.
 */
export const API_INFO = "API_INFO";
export const WORLD_REPOSITORY = "WORLD_REPOSITORY";
export const IDEMPOTENCY_STORE = "IDEMPOTENCY_STORE";
export const REALTIME_PUBLISHER = "REALTIME_PUBLISHER";

export interface ApiInfo {
  readonly contractVersion: string;
}
