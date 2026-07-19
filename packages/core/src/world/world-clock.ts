import { DomainError, fail, succeed, type Result } from "@grinta/shared";

/**
 * O relógio do mundo (MUNDO-V1) — o mundo anda sozinho. Define quanto tempo REAL
 * vale um dia lógico e quando o próximo dia dispara. É agendamento (infra), não
 * simulação: o tempo do mundo continua sendo a data (R-177). O "agora" é o
 * relógio de parede, sempre vindo da borda — nunca `Date.now()` aqui.
 *
 * Metadado de scheduling, sem invariante de simulação: gerido por um repositório
 * FOCADO (como o `MatchPlayRepository` escreve `Match`), fora do agregado.
 */
export const MIN_SECONDS_PER_DAY = 1;
export const MAX_SECONDS_PER_DAY = 31_536_000; // 1 ano real por dia lógico

export interface WorldClockState {
  readonly gameWorldId: string;
  readonly realSecondsPerDay: number | null;
  readonly clockRunning: boolean;
  /** Quando o próximo dia lógico deve rodar (ISO, UTC). `null` = parado. */
  readonly nextTickAt: string | null;
  readonly currentDate: string;
  readonly version: number;
}

/** O plano ao configurar o relógio. */
export interface SetWorldClockInput {
  readonly gameWorldId: string;
  readonly realSecondsPerDay: number;
  readonly running: boolean;
  /** O relógio de parede AGORA (ISO), da borda — para agendar o próximo tick. */
  readonly nowIso: string;
}

/** Soma segundos a um instante ISO, devolvendo ISO. Puro. */
export function addSeconds(nowIso: string, seconds: number): string {
  const ms = Date.parse(nowIso);
  if (Number.isNaN(ms)) throw new DomainError("INVALID_TIME", "Instante inválido.");
  return new Date(ms + seconds * 1000).toISOString();
}

/** O relógio está vencido? (o dia lógico já devia ter rodado). */
export function isDue(nextTickAtIso: string | null, nowIso: string): boolean {
  if (nextTickAtIso === null) return false;
  const next = Date.parse(nextTickAtIso);
  const now = Date.parse(nowIso);
  if (Number.isNaN(next) || Number.isNaN(now)) return false;
  return now >= next;
}

/** Valida a configuração do relógio (fora do range = erro). */
export function validateClock(realSecondsPerDay: number): DomainError | null {
  if (
    !Number.isInteger(realSecondsPerDay) ||
    realSecondsPerDay < MIN_SECONDS_PER_DAY ||
    realSecondsPerDay > MAX_SECONDS_PER_DAY
  ) {
    return new DomainError(
      "INVALID_WORLD_CLOCK",
      `Segundos por dia lógico deve ser inteiro entre ${MIN_SECONDS_PER_DAY} e ${MAX_SECONDS_PER_DAY}.`,
    );
  }
  return null;
}

export interface WorldClockRepository {
  getClock(gameWorldId: string): Promise<WorldClockState | null>;
  /** Grava a config e o próximo tick, com concorrência otimista por `version`. */
  saveClock(
    gameWorldId: string,
    patch: {
      realSecondsPerDay: number;
      clockRunning: boolean;
      nextTickAtIso: string | null;
    },
    expectedVersion: number,
  ): Promise<void>;
  /** Os mundos ATIVOS com o relógio rodando e vencido (para o scheduler, V3). */
  dueWorlds(nowIso: string, limit: number): Promise<readonly WorldClockState[]>;
  /** Reagenda só o próximo tick (cursor de scheduling, sem guarda de versão). */
  setNextTick(gameWorldId: string, nextTickAtIso: string): Promise<void>;
}

/**
 * Configura o relógio do mundo (MUNDO-V1): quantas horas reais vale um dia, e se
 * começa a rodar. Ao iniciar, agenda o próximo tick para `agora + duração`.
 */
export class SetWorldClock {
  public constructor(private readonly repository: WorldClockRepository) {}

  public async execute(
    input: SetWorldClockInput,
  ): Promise<Result<{ nextTickAt: string | null }, DomainError>> {
    const problem = validateClock(input.realSecondsPerDay);
    if (problem !== null) return fail(problem);

    const clock = await this.repository.getClock(input.gameWorldId);
    if (clock === null) {
      return fail(new DomainError("WORLD_NOT_FOUND", "Mundo não encontrado."));
    }

    const nextTickAtIso = input.running
      ? addSeconds(input.nowIso, input.realSecondsPerDay)
      : null;

    await this.repository.saveClock(
      input.gameWorldId,
      {
        realSecondsPerDay: input.realSecondsPerDay,
        clockRunning: input.running,
        nextTickAtIso,
      },
      clock.version,
    );
    return succeed({ nextTickAt: nextTickAtIso });
  }
}
