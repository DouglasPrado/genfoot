import type { PositionGroup, SquadPlayer } from "../screens/squad/squad-data";

export interface MobileVisualIdentity {
  readonly primaryColor: string;
  readonly secondaryColor: string;
  readonly tertiaryColor: string | null;
  readonly homeKitTemplateId: string;
  readonly awayKitTemplateId: string;
  readonly crestTemplateId: string;
}

/**
 * O clube como o read model de C3 o entrega (`club-detail`).
 *
 * **Tudo PLANO.** Era aninhado (`identity.name`, `stadium.capacity`) porque a
 * query devolvia o `WorldClubPortfolioSnapshot` cru — o mega-agregado vazando
 * até a tela. Ele morreu (R-175), e o read model agora resolve o período de
 * identidade e o estádio: o clube não tem nome, tem HISTÓRIA de nomes (BC-003),
 * e a tela não tem por que saber disso.
 */
export interface MobileClubProjection {
  readonly id: string;
  readonly status: string;
  readonly version: number;
  readonly name: string;
  readonly shortCode: string;
  readonly reputationBand: number;
  readonly stadiumName: string;
  readonly stadiumCapacity: number;
  /** `null` quando o clube ainda não foi personalizado (BC-003). */
  readonly primaryColor: string | null;
  readonly secondaryColor: string | null;
  readonly crestTemplateId: string | null;
  /** `null` = IA. Não há flag `isAi`: a IA é a ausência de controle (R-180). */
  readonly manager: { readonly accountId: string; readonly name: string } | null;
  readonly departments: readonly {
    readonly kind: string;
    readonly level: number;
    readonly capacity: number;
    readonly condition: number;
  }[];
}

/** Projeção da narrativa (C10) consumida pelo mobile: torcida por clube. */
export interface NarrativeProjection {
  readonly clubs?: readonly {
    readonly clubId: string;
    readonly fanbaseSize: number;
    readonly overall: number;
  }[];
}

export interface MobileSquadProjection {
  readonly id: string;
  readonly clubId: string;
  readonly version: number;
  readonly memberships: readonly {
    readonly playerId: string;
    readonly slot: string;
    readonly category: string;
  }[];
}

export interface ClubPortfolioProjection {
  readonly clubs: readonly MobileClubProjection[];
  readonly squads?: readonly MobileSquadProjection[];
}

const departmentPresentation: Readonly<
  Record<string, { name: string; icon: string }>
> = {
  FOOTBALL: { name: "Departamento de futebol", icon: "football" },
  TRAINING: { name: "Centro de treino", icon: "barbell" },
  MEDICAL: { name: "Departamento médico", icon: "medkit" },
  SCOUTING: { name: "Observação", icon: "search" },
  YOUTH: { name: "Categorias de base", icon: "school" },
  COMMERCIAL: { name: "Departamento comercial", icon: "briefcase" },
};

/**
 * O clube que o jogador administra.
 *
 * As telas consultavam a query `club`, que devolvia o portfólio inteiro — o
 * mega-agregado vazando até o app. Ela hoje devolve `{clubCount}` e a lista está
 * em `club-detail` (R-175: a porta de leitura é estreita de propósito).
 *
 * Enquanto isso não foi ligado, `portfolio.clubs` chegava `undefined` e o
 * `.find` estourava; guardar com `?? []` teria sido PIOR que o crash —
 * devolveria `null`, e a tela diria "sem clube" a quem acabou de assumir um.
 * Erro disfarçado de estado válido é o fallback silencioso que o CLAUDE.md §5
 * proíbe, e foi exatamente o que apareceu na tela: "clube ainda não definido"
 * em todas elas.
 *
 * `configuredClubId` vem do controle ativo do jogador. O fallback para o
 * primeiro ACTIVE existe para o dev que abre o app sem clube — em produção quem
 * não tem controle nem chega aqui.
 */
export function selectManagedClub(
  portfolio: ClubPortfolioProjection | null,
  configuredClubId: string | null,
): MobileClubProjection | null {
  const clubs = portfolio?.clubs;
  if (clubs === undefined) return null;
  if (configuredClubId !== null) {
    const configured = clubs.find((club) => club.id === configuredClubId);
    if (configured !== undefined) return configured;
  }
  return clubs.find((club) => club.status === "ACTIVE") ?? null;
}

export function buildClubInfrastructure(
  club: Pick<MobileClubProjection, "departments">,
): readonly {
  readonly id: string;
  readonly name: string;
  readonly icon: string;
  readonly level: number;
  readonly maxLevel: number;
  readonly note: string;
}[] {
  return club.departments.map((department) => {
    const presentation = departmentPresentation[department.kind] ?? {
      name: department.kind,
      icon: "construct",
    };
    return {
      id: department.kind,
      name: presentation.name,
      icon: presentation.icon,
      level: department.level,
      maxLevel: 5,
      note: `Condição ${department.condition}% · capacidade ${department.capacity}`,
    };
  });
}

const positionPresentation: Readonly<
  Record<string, { label: string; group: PositionGroup }>
> = {
  GK: { label: "GOL", group: "GOL" },
  CB: { label: "ZAG", group: "DEF" },
  LB: { label: "LE", group: "DEF" },
  RB: { label: "LD", group: "DEF" },
  CDM: { label: "VOL", group: "MEI" },
  CM: { label: "MC", group: "MEI" },
  CAM: { label: "MEI", group: "MEI" },
  LW: { label: "PTE", group: "ATA" },
  RW: { label: "PTD", group: "ATA" },
  ST: { label: "ATA", group: "ATA" },
  CF: { label: "ATA", group: "ATA" },
};

/**
 * O elenco tal como a query `roster` o devolve (RosterView do core, R-190).
 *
 * Substitui `PlayerRosterProjection` + `portfolio.squads`: a query nova já vem
 * joinada — camisa, nome e overall num objeto só. Não é preciso cruzar pessoas,
 * jogadores e memberships na tela.
 */
export interface MobileRosterProjection {
  readonly clubId: string;
  readonly squadName: string;
  readonly seasonNumber: number;
  readonly players: readonly {
    readonly playerId: string;
    readonly shirtNumber: number;
    readonly name: string;
    readonly primaryPosition: string;
    readonly overall: number;
    readonly potential: number;
    readonly age: number;
    readonly morale: number;
    readonly fitness: number;
    /** Rollup de 4 grupos (RosterView.groups). `goalkeeping` null fora do gol. */
    readonly groups?: {
      readonly technical: number;
      readonly physical: number;
      readonly mental: number;
      readonly goalkeeping: number | null;
    };
    /** Os 39 atributos finos (RosterView.attributes) — card detalhado. */
    readonly attributes?: Record<string, number | null>;
  }[];
}

/**
 * Mapeia o elenco oficial para a apresentação da tela.
 *
 * O que é REAL: camisa, nome, posição, idade, overall, potencial, moral, forma
 * física. O que DEGRADA honestamente, e por quê:
 *
 * - `contractYears: 0` — não há contratos até C6 (R-189). Zero aqui é "sem
 *   contrato materializado", não "contrato de zero ano".
 * - `form: "steady"` — forma recente vem do histórico de partidas (C5), que não
 *   existe. "steady" é o neutro honesto, não um número inventado.
 * - `starter` pela camisa ≤ 11 — titularidade de verdade é escalação (tática),
 *   que depende de comando ainda ausente.
 */
export function squadPlayersFromRoster(
  roster: MobileRosterProjection | null,
): readonly SquadPlayer[] {
  if (roster === null) return [];
  return roster.players.flatMap((player) => {
    const position = positionPresentation[player.primaryPosition];
    if (position === undefined) return [];
    return [
      {
        id: player.playerId,
        number: player.shirtNumber,
        name: player.name,
        position: position.label,
        group: position.group,
        age: player.age,
        ovr: player.overall,
        pot: player.potential,
        fitness: player.fitness,
        form: "steady",
        morale: player.morale,
        contractYears: 0,
        starter: player.shirtNumber <= 11,
        groups: player.groups ?? null,
        attributes: player.attributes ?? null,
      } satisfies SquadPlayer,
    ];
  });
}

