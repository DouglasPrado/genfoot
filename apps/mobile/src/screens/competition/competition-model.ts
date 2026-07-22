/**
 * A lógica da tela `M-COMPETITION` (doc `04-ui-ux/10`), fora do componente.
 *
 * Decide QUAIS abas existem, como as rodadas se agrupam, o que é zona de
 * acesso/rebaixamento e — o ponto mais importante — quando uma estatística está
 * **indisponível por falta de motor** em vez de zerada. Puro: sem relógio, sem
 * sorteio, sem rede.
 */

export interface ClubBadgeSource {
  readonly clubId: string;
  readonly clubName: string;
  readonly shortCode: string;
  readonly primaryColor: string | null;
  readonly secondaryColor: string | null;
  readonly crestTemplateId: string | null;
}

export interface CompetitionDetailSource {
  readonly competitionId: string;
  readonly name: string;
  readonly type: string;
  readonly format: string;
  readonly tier: number | null;
  readonly lifecycle: string;
  readonly seasonNumber: number;
  readonly startsOn: string | null;
  readonly endsOn: string | null;
  readonly clubCount: number;
  readonly totalMatches: number;
  readonly playedMatches: number;
  readonly currentRound: number | null;
  readonly totalRounds: number | null;
  readonly promotionSlots: number;
  readonly relegationSlots: number;
  readonly hasGroups: boolean;
  readonly hasKnockout: boolean;
}

export interface CompetitionMatchSource {
  readonly matchId: string;
  readonly roundNumber: number | null;
  readonly group: string | null;
  readonly scheduledOn: string;
  readonly finished: boolean;
  readonly home: ClubBadgeSource;
  readonly away: ClubBadgeSource;
  readonly homeGoals: number | null;
  readonly awayGoals: number | null;
}

export interface MatchStatsCoverageSource {
  readonly goals: boolean;
  readonly assists: boolean;
  readonly cards: boolean;
}

export type CompetitionTabId =
  | "table"
  | "groups"
  | "bracket"
  | "matches"
  | "scorers"
  | "assists"
  | "awards"
  | "rules";

export interface CompetitionTab {
  readonly id: CompetitionTabId;
  readonly label: string;
}

/**
 * As abas que ESTA competição tem.
 *
 * Uma liga não tem chaveamento e uma copa de mata-mata puro não tem tabela — o
 * doc pede "só mata-mata se existir", e `hasKnockout` já é a existência de
 * partida de mata-mata, não a promessa do formato. Aba que não leva a lugar
 * nenhum é pior que aba ausente.
 */
export function availableTabs(
  detail: CompetitionDetailSource,
): readonly CompetitionTab[] {
  const tabs: CompetitionTab[] = [];
  if (detail.hasGroups) {
    tabs.push({ id: "groups", label: "Grupos" });
  } else if (detail.format !== "KNOCKOUT") {
    tabs.push({ id: "table", label: "Tabela" });
  }
  if (detail.hasKnockout) tabs.push({ id: "bracket", label: "Chaveamento" });
  tabs.push({ id: "matches", label: "Jogos" });
  tabs.push({ id: "scorers", label: "Artilharia" });
  tabs.push({ id: "assists", label: "Assistências" });
  tabs.push({ id: "awards", label: "Premiação" });
  tabs.push({ id: "rules", label: "Regulamento" });
  return tabs;
}

export type StatKind = "scorers" | "assists";

export type StatAvailability =
  | { readonly kind: "available" }
  | { readonly kind: "engine-missing"; readonly reason: string };

/**
 * Uma estatística só é exibível se o motor de partida a PRODUZIR.
 *
 * `PlayerMatchStats` tem colunas de assistência e cartão que a simulação grava
 * com zero fixo. Mostrar "0 assistências" para o elenco inteiro afirmaria um
 * fato do jogo — ninguém deu passe para gol — que é falso: o dado não existe.
 * A tela diz "indisponível" e nomeia a causa.
 */
export function statAvailability(
  coverage: MatchStatsCoverageSource,
  kind: StatKind,
): StatAvailability {
  if (kind === "scorers") {
    return coverage.goals
      ? { kind: "available" }
      : {
          kind: "engine-missing",
          reason: "O motor de partida ainda não registra gols por jogador.",
        };
  }
  return coverage.assists
    ? { kind: "available" }
    : {
        kind: "engine-missing",
        reason:
          "O motor de partida ainda não registra assistências — não é que ninguém tenha dado passe para gol; o dado não é produzido.",
      };
}

export type TableZone = "promotion" | "relegation";

/**
 * A zona da linha na tabela. As vagas vêm da config imutável da edição (R-52):
 * numa divisão única do mundo elas são 0/0 e a tabela não pinta nada — não
 * inventamos rebaixamento onde não há para onde descer.
 */
export function tableZone(
  rank: number,
  total: number,
  slots: { readonly promotionSlots: number; readonly relegationSlots: number },
): TableZone | null {
  if (slots.promotionSlots > 0 && rank <= slots.promotionSlots) {
    return "promotion";
  }
  if (
    slots.relegationSlots > 0 &&
    rank > total - slots.relegationSlots &&
    // A sobreposição (vagas maiores que a tabela) já foi resolvida acima: o
    // acesso ganha. Aqui só falta não pintar quem já é zona de acesso.
    rank > slots.promotionSlots
  ) {
    return "relegation";
  }
  return null;
}

export interface RoundGroup {
  /** `null` = jogo sem rodada (mata-mata avulso). Vai para o fim da lista. */
  readonly roundNumber: number | null;
  readonly matches: readonly CompetitionMatchSource[];
  /** `true` só quando TODOS os jogos da rodada terminaram. */
  readonly played: boolean;
}

/** Os jogos da competição agrupados por rodada, do começo da temporada ao fim. */
export function groupMatchesByRound(
  matches: readonly CompetitionMatchSource[],
): readonly RoundGroup[] {
  const buckets = new Map<number | null, CompetitionMatchSource[]>();
  for (const match of matches) {
    const list = buckets.get(match.roundNumber) ?? [];
    list.push(match);
    buckets.set(match.roundNumber, list);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => {
      // O balde sem rodada vai por último — some se ordenasse como número.
      if (a === null) return 1;
      if (b === null) return -1;
      return a - b;
    })
    .map(([roundNumber, list]) => ({
      roundNumber,
      matches: [...list].sort(
        (a, b) =>
          a.scheduledOn.localeCompare(b.scheduledOn) ||
          a.matchId.localeCompare(b.matchId),
      ),
      played: list.every((m) => m.finished),
    }));
}

const FORMAT_LABELS: Record<string, string> = {
  ROUND_ROBIN: "Pontos corridos",
  DOUBLE_ROUND_ROBIN: "Pontos corridos (ida e volta)",
  KNOCKOUT: "Mata-mata",
  GROUPS_AND_KNOCKOUT: "Grupos + mata-mata",
};

/** Formato desconhecido devolve o próprio código — melhor que rótulo vazio. */
export function formatLabel(format: string): string {
  return FORMAT_LABELS[format] ?? format;
}

const LIFECYCLE_LABELS: Record<string, string> = {
  DRAFT: "Em preparação",
  SCHEDULED: "A começar",
  RUNNING: "Em disputa",
  FINISHED: "Encerrada",
};

export function lifecycleLabel(lifecycle: string): string {
  return LIFECYCLE_LABELS[lifecycle] ?? lifecycle;
}
