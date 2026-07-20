/**
 * Porta de materialização da temporada como entidade do MUNDO (R-219).
 *
 * A `Season` deixa de ser artefato reativo da competição (`ensureSeasonId`) e
 * passa a nascer com o mundo. Esta porta é o único ponto que escreve as linhas
 * de `Season` e o `currentSeasonId` do mundo — a competição só ANEXA (reusa o
 * que já existe).
 */
export interface SeasonMaterialization {
  /** Id (determinístico) da temporada corrente — vai para `GameWorld.currentSeasonId`. */
  readonly currentSeasonId: string;
  /** Número (1-based) da temporada corrente. */
  readonly currentSeasonNumber: number;
}

export interface SeasonLifecycleRepository {
  /**
   * Garante que existam as temporadas de 1 até a corrente (derivada de
   * `startDate`→`currentDate`), com a corrente `ACTIVE` e as anteriores
   * `FINISHED`, e aponta `GameWorld.currentSeasonId` para a corrente.
   *
   * Idempotente: reexecutar com o mesmo relógio não cria duplicata nem reabre
   * temporada fechada — é upsert por `(gameWorldId, number)` com id
   * determinístico. Serve tanto à gênese/ativação (corrente = 1) quanto à
   * virada (corrente = número novo depois do relógio andar).
   */
  ensureCurrentSeason(input: {
    readonly gameWorldId: string;
    readonly worldSeed: string;
    readonly startDate: string;
    readonly currentDate: string;
  }): Promise<SeasonMaterialization>;
}
