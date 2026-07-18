import { DomainError, fail, succeed, type Result } from "@grinta/shared";
import type { GameWorldId } from "@grinta/shared";

import type { ClubId, CompetitionId } from "../genesis/genesis-types.js";

import {
  CompetitionLifecycle,
  type CompetitionConfig,
} from "./competition-config.js";
import { CompetitionFormat, type CompetitionType } from "./competition-types.js";

/**
 * Competition (C7) — o agregado AUTORADO (R-202). Nasce em RASCUNHO editável;
 * o `lock` valida a config inteira, congela e agenda; daí em diante a config é
 * imutável (R-52). `version` por linha (R-175). Sem `Date.now()`/`Math.random()`.
 */
export interface CompetitionAggregateSnapshot {
  readonly id: CompetitionId;
  readonly gameWorldId: GameWorldId;
  readonly name: string;
  readonly type: CompetitionType;
  readonly format: CompetitionFormat;
  /** Divisão/nível (1 = topo) para liga; null para copa. */
  readonly tier: number | null;
  readonly reputation: number;
  readonly lifecycle: CompetitionLifecycle;
  /** Janela da competição (R-177: data, não relógio). null enquanto rascunho. */
  readonly startsOn: string | null;
  readonly endsOn: string | null;
  /** Os clubes participantes (a ordem é o sorteio de sementes, quando copa). */
  readonly clubIds: readonly ClubId[];
  readonly config: CompetitionConfig;
  readonly version: number;
}

/** O patch de edição em RASCUNHO. Campos omitidos ficam como estão. */
export interface ConfigureCompetitionPatch {
  readonly name?: string;
  readonly format?: CompetitionFormat;
  readonly type?: CompetitionType;
  readonly tier?: number | null;
  readonly clubIds?: readonly string[];
  readonly startsOn?: string | null;
  readonly endsOn?: string | null;
  readonly config?: CompetitionConfig;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MINOR_RE = /^\d+$/;

export class Competition {
  private constructor(private state: CompetitionAggregateSnapshot) {}

  /** Nasce em RASCUNHO, sem janela nem participantes, versão 1. */
  public static create(
    input: {
      readonly id: string;
      readonly gameWorldId: string;
      readonly name: string;
      readonly type: CompetitionType;
      readonly format: CompetitionFormat;
      readonly tier: number | null;
      readonly reputation: number;
    },
    config: CompetitionConfig,
  ): Result<Competition, DomainError> {
    if (input.name.trim().length === 0) {
      return fail(new DomainError("INVALID_COMPETITION", "Nome obrigatório."));
    }
    return succeed(
      new Competition({
        id: input.id as CompetitionId,
        gameWorldId: input.gameWorldId as GameWorldId,
        name: input.name,
        type: input.type,
        format: input.format,
        tier: input.tier,
        reputation: input.reputation,
        lifecycle: CompetitionLifecycle.DRAFT,
        startsOn: null,
        endsOn: null,
        clubIds: [],
        config,
        version: 1,
      }),
    );
  }

  public static fromSnapshot(
    snapshot: CompetitionAggregateSnapshot,
  ): Result<Competition, DomainError> {
    if (snapshot.version < 1) {
      return fail(new DomainError("INVALID_COMPETITION", "Versão inválida."));
    }
    const unique = new Set(snapshot.clubIds);
    if (unique.size !== snapshot.clubIds.length) {
      return fail(
        new DomainError("INVALID_COMPETITION", "Participante duplicado."),
      );
    }
    return succeed(new Competition(snapshot));
  }

  /** Edita em RASCUNHO. Depois do lock, falha com COMPETITION_LOCKED (R-52). */
  public configure(
    patch: ConfigureCompetitionPatch,
  ): Result<void, DomainError> {
    if (this.state.lifecycle !== CompetitionLifecycle.DRAFT) {
      return fail(
        new DomainError(
          "COMPETITION_LOCKED",
          "A competição já foi iniciada; a config é imutável.",
        ),
      );
    }
    const next: CompetitionAggregateSnapshot = {
      ...this.state,
      name: patch.name ?? this.state.name,
      format: patch.format ?? this.state.format,
      type: patch.type ?? this.state.type,
      tier: patch.tier === undefined ? this.state.tier : patch.tier,
      clubIds:
        patch.clubIds === undefined
          ? this.state.clubIds
          : (patch.clubIds as readonly ClubId[]),
      startsOn:
        patch.startsOn === undefined ? this.state.startsOn : patch.startsOn,
      endsOn: patch.endsOn === undefined ? this.state.endsOn : patch.endsOn,
      config: patch.config ?? this.state.config,
      version: this.state.version + 1,
    };
    if (next.name.trim().length === 0) {
      return fail(new DomainError("INVALID_COMPETITION", "Nome obrigatório."));
    }
    const unique = new Set(next.clubIds);
    if (unique.size !== next.clubIds.length) {
      return fail(
        new DomainError("INVALID_COMPETITION", "Participante duplicado."),
      );
    }
    this.state = next;
    return succeed(undefined);
  }

  /**
   * Congela e agenda (RASCUNHO→AGENDADA). Valida a config INTEIRA: janela,
   * número de participantes coerente com o formato, regras e prêmios sãos. É a
   * última chance de recusar; depois nada mais muda.
   */
  public lock(): Result<void, DomainError> {
    if (this.state.lifecycle !== CompetitionLifecycle.DRAFT) {
      return fail(
        new DomainError(
          "COMPETITION_LOCKED",
          "Só um rascunho pode ser iniciado.",
        ),
      );
    }
    const problem = this.validateForLock();
    if (problem !== null) return fail(problem);
    this.transition(CompetitionLifecycle.SCHEDULED);
    return succeed(undefined);
  }

  /** Começa a valer (AGENDADA→EM_ANDAMENTO) quando a janela abre. */
  public start(): Result<void, DomainError> {
    if (this.state.lifecycle !== CompetitionLifecycle.SCHEDULED) {
      return fail(
        new DomainError(
          "COMPETITION_NOT_SCHEDULED",
          "Só uma competição agendada pode começar.",
        ),
      );
    }
    this.transition(CompetitionLifecycle.RUNNING);
    return succeed(undefined);
  }

  /** Homologa (EM_ANDAMENTO→ENCERRADA). */
  public finish(): Result<void, DomainError> {
    if (this.state.lifecycle !== CompetitionLifecycle.RUNNING) {
      return fail(
        new DomainError(
          "COMPETITION_NOT_RUNNING",
          "Só uma competição em andamento pode encerrar.",
        ),
      );
    }
    this.transition(CompetitionLifecycle.FINISHED);
    return succeed(undefined);
  }

  public snapshot(): CompetitionAggregateSnapshot {
    return this.state;
  }

  private transition(lifecycle: CompetitionLifecycle): void {
    this.state = {
      ...this.state,
      lifecycle,
      version: this.state.version + 1,
    };
  }

  /** Retorna o primeiro problema que impede o lock, ou `null` se está pronta. */
  private validateForLock(): DomainError | null {
    const { startsOn, endsOn, clubIds, config, format } = this.state;
    if (
      startsOn === null ||
      endsOn === null ||
      !DATE_RE.test(startsOn) ||
      !DATE_RE.test(endsOn)
    ) {
      return new DomainError(
        "INVALID_COMPETITION_WINDOW",
        "Datas de início e término são obrigatórias (YYYY-MM-DD).",
      );
    }
    if (startsOn >= endsOn) {
      return new DomainError(
        "INVALID_COMPETITION_WINDOW",
        "O término tem que ser depois do início.",
      );
    }

    const n = clubIds.length;
    if (new Set(clubIds).size !== n) {
      return new DomainError("INVALID_COMPETITION", "Participante duplicado.");
    }

    const isLeague =
      format === CompetitionFormat.ROUND_ROBIN ||
      format === CompetitionFormat.DOUBLE_ROUND_ROBIN;
    if (isLeague) {
      // Turno-returno exige nº par (sem folga) e pelo menos 4 clubes (R-204: 20
      // é o padrão de divisão; o piso mantém o agregado geral e testável).
      if (n < 4 || n % 2 !== 0) {
        return new DomainError(
          "INVALID_COMPETITION_PARTICIPANTS",
          "Liga precisa de um número par de clubes (mínimo 4).",
        );
      }
      if (
        config.rules.relegationSlots + config.rules.promotionSlots >= n
      ) {
        return new DomainError(
          "INVALID_COMPETITION_RULES",
          "Vagas de acesso/rebaixamento não cabem na divisão.",
        );
      }
    } else if (format === CompetitionFormat.KNOCKOUT) {
      if (n < 2 || !isPowerOfTwo(n)) {
        return new DomainError(
          "INVALID_COMPETITION_PARTICIPANTS",
          "Mata-mata precisa de potência de 2 (2, 4, 8, 16, 32…).",
        );
      }
    } else if (format === CompetitionFormat.GROUPS_AND_KNOCKOUT) {
      const groups = config.rules.groupCount;
      const perGroup = config.rules.qualifiersPerGroup;
      if (groups === null || perGroup === null || groups < 1 || perGroup < 1) {
        return new DomainError(
          "INVALID_COMPETITION_RULES",
          "Formato de grupos exige nº de grupos e classificados por grupo.",
        );
      }
      if (n < groups * 2 || n % groups !== 0) {
        return new DomainError(
          "INVALID_COMPETITION_PARTICIPANTS",
          "Os clubes precisam dividir igualmente entre os grupos.",
        );
      }
      if (!isPowerOfTwo(groups * perGroup)) {
        return new DomainError(
          "INVALID_COMPETITION_RULES",
          "Os classificados dos grupos precisam formar um chaveamento (potência de 2).",
        );
      }
    } else {
      return new DomainError(
        "INVALID_COMPETITION_FORMAT",
        "Formato ainda não suportado.",
      );
    }

    return this.validateConfigValues();
  }

  private validateConfigValues(): DomainError | null {
    const { rules, prizes } = this.state.config;
    if (
      !Number.isInteger(rules.pointsWin) ||
      !Number.isInteger(rules.pointsDraw) ||
      rules.pointsWin < rules.pointsDraw ||
      rules.pointsDraw < 0
    ) {
      return new DomainError(
        "INVALID_COMPETITION_RULES",
        "Pontuação inválida (vitória ≥ empate ≥ 0).",
      );
    }
    if (rules.legs !== 1 && rules.legs !== 2) {
      return new DomainError(
        "INVALID_COMPETITION_RULES",
        "Mando é jogo único (1) ou ida-e-volta (2).",
      );
    }
    if (rules.tiebreakers.length === 0) {
      return new DomainError(
        "INVALID_COMPETITION_RULES",
        "Pelo menos um critério de desempate.",
      );
    }
    const minors = [
      prizes.participationMinor,
      prizes.winBonusMinor,
      prizes.topScorerMinor,
      prizes.bestPlayerMinor,
      ...prizes.positionMinor,
    ];
    if (!minors.every((m) => MINOR_RE.test(m))) {
      return new DomainError(
        "INVALID_COMPETITION_PRIZES",
        "Valores de prêmio precisam ser inteiros não-negativos (minor units).",
      );
    }
    return null;
  }
}

function isPowerOfTwo(n: number): boolean {
  return n >= 1 && (n & (n - 1)) === 0;
}
