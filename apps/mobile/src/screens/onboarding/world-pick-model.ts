/**
 * M-WORLD-PICK — a lista de mundos do onboarding (R-208).
 *
 * Substitui o botão "ENTRAR NO MUNDO", que entrava no mundo fixado no build.
 * Aqui o jogador vê os mundos que existem, com o que o doc da tela pede para
 * decidir: nome, temporada, nº de clubes e vagas.
 *
 * A elegibilidade é assunto do servidor (R-210): este módulo só ROTULA o fato
 * que a leitura oficial já entregou (`myParticipation`). Ele não decide quem
 * pode entrar — decidir aqui seria o cliente autoritativo que o §6 proíbe, e a
 * API recusaria a entrada depois com `ACCOUNT_COOLDOWN_ACTIVE`.
 */

/**
 * Uma linha da lista como a API entrega (`GET /api/v1/worlds`).
 *
 * `name` é anulável no schema (`GameWorld.name`, prisma/schema.prisma:841) e a
 * maioria dos mundos semeados nasce sem ele — daí o fallback para `seed`.
 */
export interface WorldListSource {
  readonly id: string;
  readonly seed: string;
  readonly name?: string | null;
  readonly status: string;
  readonly currentDate: string;
  readonly startDate: string;
  readonly clubCount: number;
  readonly openSlots: number;
  readonly myParticipation: {
    readonly status: string;
    readonly hasActiveControl: boolean;
    readonly cooldownUntilOn: string | null;
  } | null;
}

/**
 * O que o jogador pode fazer com este mundo.
 *
 * `unknown` NÃO é "não pode": é "não dá para saber sem login". Deslogado, a
 * vitrine é a mesma para todo mundo (R-209) — nenhum selo, nenhum motivo, nada
 * derivado de identidade.
 */
export type WorldEntry =
  | { readonly kind: "unknown" }
  | { readonly kind: "enter" }
  | { readonly kind: "resume" }
  | { readonly kind: "cooldown"; readonly untilOn: string }
  | { readonly kind: "full" }
  | { readonly kind: "closed" };

export interface WorldCard {
  readonly id: string;
  readonly title: string;
  readonly season: string;
  readonly clubCount: number;
  readonly openSlots: number;
  readonly entry: WorldEntry;
  /** Se a linha é acionável — a tela desabilita o toque quando falso. */
  readonly selectable: boolean;
}

/** Mundos que aceitam entrada. Os demais aparecem, mas não são acionáveis. */
const OPEN_STATUS = "ACTIVE";

/**
 * O nome que o jogador lê. Sem `name`, cai no `seed` encurtado — mostrar um
 * UUID inteiro num card não ajuda ninguém a escolher, e mentir um nome bonito
 * ("Mundo 1") esconderia que o mundo nasceu sem identidade.
 */
export function worldTitle(world: WorldListSource): string {
  const name = world.name?.trim();
  if (name !== undefined && name !== "") return name;
  return `Mundo ${world.seed.slice(0, 8)}`;
}

/**
 * A elegibilidade DESTE jogador neste mundo.
 *
 * Ordem importa: controle ativo vence tudo (quem já tem clube não escolhe mundo,
 * volta para o dele), depois cooldown, depois vagas. Um mundo cheio para quem
 * está em cooldown deve dizer "espera", não "cheio" — o motivo que bloqueia
 * primeiro é o que o jogador precisa resolver.
 */
export function deriveEntry(
  world: WorldListSource,
  options: { readonly authenticated: boolean },
): WorldEntry {
  if (!options.authenticated) return { kind: "unknown" };
  if (world.status !== OPEN_STATUS) return { kind: "closed" };

  const mine = world.myParticipation;
  if (mine !== null) {
    if (mine.hasActiveControl) return { kind: "resume" };
    // `<=`: o cooldown vale ATÉ O FIM do dia `untilOn` — mesmo `<=` de
    // `WorldParticipant.isInCooldownOn` e de `deriveOnboardingStep`. Um `<`
    // ofereceria um mundo que a API recusa com ACCOUNT_COOLDOWN_ACTIVE.
    // A data é a DESTE mundo (`world.currentDate`), não uma global: cada mundo
    // tem seu próprio relógio (R-177), e comparar o cooldown de um contra a
    // data de outro erra nos dois sentidos — libera quem está preso e prende
    // quem está livre.
    const until = mine.cooldownUntilOn;
    if (until !== null && world.currentDate <= until) {
      return { kind: "cooldown", untilOn: until };
    }
  }

  if (world.openSlots <= 0) return { kind: "full" };
  return { kind: "enter" };
}

/** Um card é acionável quando há o que fazer com ele. */
export function isSelectable(entry: WorldEntry): boolean {
  return (
    entry.kind === "enter" ||
    entry.kind === "resume" ||
    entry.kind === "unknown"
  );
}

/**
 * A lista pronta para render.
 *
 * Ordena por "dá para entrar" primeiro, e desempata por mais vagas — a decisão
 * que o jogador está tomando é "onde eu caibo", então o que cabe vem antes.
 * Mundos fechados descem, mas não somem: sumir esconderia que o mundo existe.
 */
export function deriveWorldCards(
  worlds: readonly WorldListSource[],
  options: { readonly authenticated: boolean },
): readonly WorldCard[] {
  const cards = worlds.map((world) => {
    const entry = deriveEntry(world, options);
    return {
      id: world.id,
      title: worldTitle(world),
      season: world.currentDate,
      clubCount: world.clubCount,
      openSlots: world.openSlots,
      entry,
      selectable: isSelectable(entry),
    };
  });

  const rank = (card: WorldCard): number => {
    if (card.entry.kind === "resume") return 0;
    if (card.entry.kind === "enter") return 1;
    if (card.entry.kind === "unknown") return 2;
    if (card.entry.kind === "cooldown") return 3;
    if (card.entry.kind === "full") return 4;
    return 5;
  };

  return [...cards].sort((a, b) => {
    const byRank = rank(a) - rank(b);
    if (byRank !== 0) return byRank;
    const bySlots = b.openSlots - a.openSlots;
    if (bySlots !== 0) return bySlots;
    // Desempate estável por id: sem ele, a ordem de dois mundos idênticos
    // dependeria da ordem que o servidor mandou, e a lista dançaria a cada
    // refetch.
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/** O rótulo do selo de cada card. `unknown` não tem selo (R-209). */
export function entryLabel(entry: WorldEntry): string | null {
  switch (entry.kind) {
    case "unknown":
      return null;
    case "enter":
      return "Vagas abertas";
    case "resume":
      return "Você já joga aqui";
    case "cooldown":
      return "Em espera";
    case "full":
      return "Sem vagas";
    case "closed":
      return "Fechado";
  }
}
