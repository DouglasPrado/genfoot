/**
 * Tokens de injeção explícitos. Usamos tokens (não injeção por tipo/metadados)
 * para que a DI funcione tanto no build `tsc` quanto sob o vitest/esbuild, que
 * não emite `emitDecoratorMetadata`.
 */
export const API_INFO = "API_INFO";
/** O cliente Prisma. O boot exige `DATABASE_URL`: o Postgres é o único armazenamento. */
export const PRISMA_CLIENT = "PRISMA_CLIENT";
/** O mundo, no Postgres (R-173/R-182). Raiz de tudo: quase todo agregado pendura nele. */
export const GAME_WORLD_REPOSITORY = "GAME_WORLD_REPOSITORY";
/** C3 escrita — o clube é tabela (R-175). É o que destrava `identity:reserve-club`. */
export const CLUB_REPOSITORY = "CLUB_REPOSITORY";
/**
 * C3 leitura. Token SEPARADO da escrita, e não é cerimônia: a porta de escrita
 * carrega UM clube por id; a tela quer a lista do mundo. Injetar uma no lugar da
 * outra é o defeito que o e2e pegou com um 500.
 */
export const CLUB_READ_MODEL = "CLUB_READ_MODEL";
export const SQUAD_READ_MODEL = "SQUAD_READ_MODEL";
export const LEDGER_READ_MODEL = "LEDGER_READ_MODEL";
/** Escopo transacional de C3 (Decisão 19.10): clube + evento no mesmo commit. */
export const CLUB_UNIT_OF_WORK = "CLUB_UNIT_OF_WORK";
export const GENESIS_UNIT_OF_WORK = "GENESIS_UNIT_OF_WORK";
/** C1 leitura fora do UoW: "alguém está jogando este mundo?" antes de apagá-lo. */
export const CLUB_CONTROL_REPOSITORY = "CLUB_CONTROL_REPOSITORY";
/** C2 leitura: a LISTA dos mundos. Sem ela o admin só via o que o navegador lembrava. */
export const WORLD_READ_MODEL = "WORLD_READ_MODEL";
export const IDEMPOTENCY_STORE = "IDEMPOTENCY_STORE";
export const REALTIME_PUBLISHER = "REALTIME_PUBLISHER";
export const SESSION_STORE = "SESSION_STORE";
/** A conta de plataforma (R-172). Global: não pende de mundo. */
export const USER_ACCOUNT_REPOSITORY = "USER_ACCOUNT_REPOSITORY";
/**
 * Escopo transacional de C1 (R-175). Único caminho de escrita da identidade:
 * agregado e evento no mesmo commit (Decisão 19.10).
 */
export const IDENTITY_UNIT_OF_WORK = "IDENTITY_UNIT_OF_WORK";
/** Leitura de C1: fora do UnitOfWork — query não abre transação. */
export const IDENTITY_READ_MODEL = "IDENTITY_READ_MODEL";

/**
 * Armazenamento de objetos (R2). Token explícito como todos os outros: o `tsx`
 * não emite `emitDecoratorMetadata`, então injeção por TIPO chega `undefined` no
 * construtor — silenciosamente, e só estoura no primeiro uso. É por isso que
 * todo provider deste app é resolvido por token, e não por classe.
 */
export const OBJECT_STORAGE = "OBJECT_STORAGE";

export interface ApiInfo {
  readonly contractVersion: string;
}
