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

export interface PlayerRosterProjection {
  readonly persons: readonly {
    readonly id: string;
    readonly firstName: string;
    readonly lastName: string;
    readonly birthDate: string;
  }[];
  readonly players: readonly {
    readonly id: string;
    readonly personId: string;
    readonly primaryPosition: string;
    readonly currentAbility: number;
    readonly potentialAbility: number;
    readonly dynamicState: {
      readonly morale: number;
      readonly confidence: number;
      readonly fatigue: number;
    };
  }[];
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

function ageOn(birthDate: string, on: string): number {
  const birth = new Date(`${birthDate}T00:00:00Z`);
  const date = new Date(`${on}T00:00:00Z`);
  let age = date.getUTCFullYear() - birth.getUTCFullYear();
  if (
    date.getUTCMonth() < birth.getUTCMonth() ||
    (date.getUTCMonth() === birth.getUTCMonth() &&
      date.getUTCDate() < birth.getUTCDate())
  ) {
    age -= 1;
  }
  return age;
}

export function squadPlayersFromProjections(
  portfolio: ClubPortfolioProjection | null,
  roster: PlayerRosterProjection | null,
  clubId: string,
  worldDate: string,
): readonly SquadPlayer[] {
  const squad = portfolio?.squads?.find(
    (candidate) => candidate.clubId === clubId,
  );
  if (squad === undefined || roster === null) return [];
  const players = new Map(roster.players.map((player) => [player.id, player]));
  const persons = new Map(roster.persons.map((person) => [person.id, person]));

  return squad.memberships.flatMap((membership, index) => {
    const player = players.get(membership.playerId);
    const person =
      player === undefined ? undefined : persons.get(player.personId);
    const position =
      player === undefined
        ? undefined
        : positionPresentation[player.primaryPosition];
    if (player === undefined || person === undefined || position === undefined)
      return [];
    const slotNumber =
      Number.parseInt(membership.slot.replace(/\D/g, ""), 10) || index + 1;
    return [
      {
        id: player.id,
        number: slotNumber,
        name: `${person.firstName} ${person.lastName}`,
        position: position.label,
        group: position.group,
        age: ageOn(person.birthDate, worldDate),
        ovr: player.currentAbility,
        pot: player.potentialAbility,
        fitness: Math.max(0, 100 - player.dynamicState.fatigue),
        form:
          player.dynamicState.confidence >= 65
            ? "up"
            : player.dynamicState.confidence < 45
              ? "down"
              : "steady",
        morale: player.dynamicState.morale,
        contractYears: 0,
        // Titularidade oficial pelo número do slot (S01–S11 = XI inicial),
        // estável sob remove/assign — a ordem das memberships não importa.
        starter: slotNumber <= 11,
      } satisfies SquadPlayer,
    ];
  });
}
