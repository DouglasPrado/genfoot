/**
 * Leitura de C3 — separada da porta de escrita (R-175).
 *
 * `ClubRepository` carrega UM clube por `(gameWorldId, id)`, e é estreito de
 * propósito. Uma tela precisa do oposto: a lista do mundo. Forçar a query pela
 * porta de escrita traria de volta o "carregue o mundo inteiro" que a R-175
 * acabou de matar — que era literalmente o `WorldClubPortfolio`.
 *
 * Repare no que a view expõe: `name` e `shortCode` como campos simples. A
 * escrita não os tem — o clube não tem nome, tem HISTÓRIA de nomes, e o nome de
 * hoje é o período com `effectiveThrough IS NULL` (BC-003). É o read model
 * fazendo o trabalho dele: resolve o join e entrega o que o cliente conhece.
 */
export interface ClubListItemView {
  readonly id: string;
  readonly name: string;
  readonly shortCode: string;
  readonly regionId: string;
  readonly status: string;
  readonly reputationBand: number;
  readonly stadiumName: string;
  readonly stadiumCapacity: number;
  /**
   * A identidade visual do período vigente, ou `null` — clube GERADO nasce sem
   * ela, e o jogador a define ao personalizar (BC-003).
   *
   * `crestTemplateId` referencia o catálogo canônico (`visual-identity-catalog`,
   * 4 modelos). O cliente renderiza o SVG pelo id; a API não manda desenho.
   */
  readonly primaryColor: string | null;
  readonly secondaryColor: string | null;
  readonly crestTemplateId: string | null;
}

export interface ClubWorldView {
  readonly gameWorldId: string;
  readonly clubs: readonly ClubListItemView[];
}

export interface ClubReadModel {
  /** Quantos clubes o mundo tem. É o que prova que a gênese materializou. */
  summary(gameWorldId: string): Promise<Readonly<{ clubCount: number }>>;
  worldView(gameWorldId: string): Promise<ClubWorldView>;
}
