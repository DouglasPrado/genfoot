/**
 * Arquétipos de GOLEIRO (M-TRAINING-INDIV, "plano de treino de goleiros").
 *
 * A enumeração canônica é do game design (§10): `clássico` / `líbero` /
 * `shot-stopper` — e os caminhos que os geram ("goleiro + reflexo → shot-stopper",
 * "goleiro + jogo com os pés → líbero"). Cada arquétipo é um CONJUNTO de
 * atributos de GK que o plano individual desenvolve (espalhado, mais fraco
 * primeiro), como uma posição faz com as recomendadas. A composição de cada
 * conjunto é calibração minha (VAL-001), ancorada nas dicas do doc.
 */

export const GK_ARCHETYPES = [
  {
    archetype: "SHOT_STOPPER",
    label: "Shot-stopper",
    // Reativo: reflexo + um-a-um + posicionamento + pênalti.
    attributes: [
      "goalkeeperReflexes",
      "goalkeeperOneOnOne",
      "goalkeeperPositioning",
      "goalkeeperPenalty",
    ],
  },
  {
    archetype: "SWEEPER",
    label: "Líbero (moderno)",
    // Jogo com os pés: reposição + comando + posicionamento + um-a-um.
    attributes: [
      "goalkeeperKicking",
      "goalkeeperCommand",
      "goalkeeperPositioning",
      "goalkeeperOneOnOne",
    ],
  },
  {
    archetype: "CLASSIC",
    label: "Clássico (dominador de área)",
    // Área: jogo aéreo + saída de gol + comando + posicionamento.
    attributes: [
      "goalkeeperAerial",
      "goalkeeperHandling",
      "goalkeeperCommand",
      "goalkeeperPositioning",
    ],
  },
] as const;

export type GkArchetype = (typeof GK_ARCHETYPES)[number]["archetype"];

/** Os atributos de GK do arquétipo, ou `[]` se o arquétipo é desconhecido. */
export function archetypeAttributes(archetype: string): readonly string[] {
  return GK_ARCHETYPES.find((a) => a.archetype === archetype)?.attributes ?? [];
}

export function archetypeLabel(archetype: string): string {
  return GK_ARCHETYPES.find((a) => a.archetype === archetype)?.label ?? archetype;
}
