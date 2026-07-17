/**
 * O ciclo de vida operacional do mundo, traduzido para o operador.
 *
 * **Este módulo é o espelho do agregado, e a fidelidade é o ponto.** Cada ação
 * oferecida aqui tem que ser uma transição que `GameWorld` aceita — oferecer um
 * botão que o domínio recusa é prometer ao operador algo que vira
 * `INVALID_WORLD_TRANSITION` no clique. O teste percorre os quatro estados e
 * confere isso contra a lista permitida.
 *
 * O vocabulário difere de propósito: o domínio fala `CREATING`/`PAUSED`, o
 * operador fala "em breve"/"congelado". A tradução mora aqui, num lugar só, e
 * não espalhada em `status === "PAUSED" ? …` pelos componentes.
 *
 * Cliente não-autoritativo: nada aqui decide se a transição vale — quem decide é
 * o servidor. Isto decide o que OFERECER.
 */

export type LifecycleActionKey = "activate" | "pause" | "resume" | "archive";

export interface LifecycleAction {
  readonly key: LifecycleActionKey;
  readonly label: string;
  readonly commandType: string;
  readonly tone: "primary" | "danger" | "ghost";
  /** Diálogo de confirmação antes de disparar. */
  readonly confirm: boolean;
  /** Oferece campo de motivo, que viaja até o evento. */
  readonly reason: boolean;
  /** O que a ação faz, na primeira pessoa do operador. */
  readonly hint: string;
}

export interface LifecycleState {
  readonly label: string;
  readonly description: string;
  /** O relógio do mundo anda? É a diferença prática entre os estados. */
  readonly clockRunning: boolean;
  /** `false` = status que a tela não conhece; mostra o código cru. */
  readonly known: boolean;
  readonly tone: "ok" | "warn" | "neutral";
}

const STATES: Record<string, Omit<LifecycleState, "known">> = {
  CREATING: {
    label: "Em breve",
    description:
      "O mundo existe e ainda não abriu. Precisa da gênese (16 clubes) antes de ativar.",
    clockRunning: false,
    tone: "neutral",
  },
  ACTIVE: {
    label: "Ativo",
    description: "Em operação. O relógio anda e os commands rodam.",
    clockRunning: true,
    tone: "ok",
  },
  PAUSED: {
    label: "Congelado",
    description:
      "Legível, e o relógio parado. Nenhuma partida nova roda. Reversível a qualquer momento.",
    clockRunning: false,
    tone: "warn",
  },
  ARCHIVED: {
    label: "Inativo",
    description:
      "Arquivado (R-56): read-only, com histórico, títulos e recordes preservados. Reversível por decisão administrativa.",
    clockRunning: false,
    tone: "warn",
  },
};

const ACTIONS: Record<LifecycleActionKey, LifecycleAction> = {
  activate: {
    key: "activate",
    label: "Ativar mundo",
    commandType: "world:activate",
    tone: "primary",
    confirm: false,
    reason: false,
    hint: "Abre o mundo. Exige a gênese pronta — sem 16 clubes o servidor recusa.",
  },
  pause: {
    key: "pause",
    label: "Congelar",
    commandType: "world:pause",
    tone: "ghost",
    // Sem confirmação: reversível na hora, e um diálogo em operação de incidente
    // é atrito na hora errada. O motivo, sim, vale — ele vira histórico.
    confirm: false,
    reason: true,
    hint: "Para o relógio. O mundo segue legível.",
  },
  resume: {
    key: "resume",
    label: "Voltar a ativar",
    commandType: "world:resume",
    tone: "primary",
    confirm: false,
    reason: false,
    hint: "O relógio volta a andar.",
  },
  archive: {
    key: "archive",
    label: "Inativar",
    commandType: "world:archive",
    tone: "danger",
    // Confirma porque alcança o mundo inteiro — não porque seja permanente. R-56
    // exige que seja reversível, e é.
    confirm: true,
    reason: true,
    hint: "Read-only. Preserva tudo e pode ser reaberto.",
  },
};

/** O que cada estado permite. Espelha as guardas de `GameWorld`. */
const TRANSITIONS: Record<string, readonly LifecycleActionKey[]> = {
  CREATING: ["activate"],
  ACTIVE: ["pause", "archive"],
  PAUSED: ["resume", "archive"],
  ARCHIVED: ["resume"],
};

export function lifecycleState(status: string): LifecycleState {
  const known = STATES[status];
  if (known !== undefined) return { ...known, known: true };

  // `FINISHED` cai aqui: existe no enum e nenhuma transição o produz. Inventar
  // um rótulo seria fingir que a tela sabe operá-lo; renderizar vazio seria pior.
  return {
    label: status,
    description:
      "Status que esta tela não conhece. Nenhuma ação é oferecida — o domínio não tem transição a partir dele.",
    clockRunning: false,
    known: false,
    tone: "neutral",
  };
}

export function lifecycleActions(status: string): readonly LifecycleAction[] {
  return (TRANSITIONS[status] ?? []).map((key) => ACTIONS[key]);
}
