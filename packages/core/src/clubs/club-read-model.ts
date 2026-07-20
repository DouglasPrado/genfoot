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
  /** Entrosamento do time (R-220 Fase 3): 0..100. Sobe jogando e treinando. */
  readonly cohesion: number;
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
  /**
   * Quem comanda o clube, ou `null` — e `null` significa **IA**.
   *
   * Isto é a R-180 na tela: "IA é a AUSÊNCIA de controle, não um tipo de
   * controle". Não existe `controlType: "AI"` para consultar; existe um
   * `ClubControl` ativo, ou não existe. O read model resolve o join
   * (`Club → ClubControl ACTIVE → WorldParticipant → UserAccount`) e entrega a
   * pergunta respondida.
   *
   * Um campo `isAi: boolean` seria a projeção duplicada que a R-180 matou: duas
   * fontes para "quem comanda" divergem em silêncio.
   */
  readonly manager: { readonly accountId: string; readonly name: string } | null;
  /**
   * Até quando o clube está RESERVADO por alguém que ainda decide, ou `null`.
   *
   * É estado diferente de ter dono, e a diferença é do canon: a reserva é
   * retenção MOLE com prazo (R-25) — o clube volta ao pool se o prazo vencer ou
   * o jogador desistir. Quem tem `manager` está tomado; quem tem
   * `reservedUntil` está em decisão.
   *
   * Os dois errorCodes já separam isso (R-186): `CLUB_ALREADY_CONTROLLED` para
   * o primeiro, `CLUB_SLOT_UNAVAILABLE` para o segundo. A leitura tem de dar ao
   * cliente como distinguir ANTES de tentar — senão a tela só descobre pelo erro.
   */
  readonly reservedUntil: string | null;
  /**
   * `version` do agregado. A tela precisa dele para mandar `expectedVersion` num
   * command — concorrência otimista por agregado (R-175). Sem ele, o cliente
   * teria de adivinhar ou o servidor teria de aceitar escrita cega.
   */
  readonly version: number;
  /**
   * Os departamentos, para a tela de infraestrutura.
   *
   * `maxLevel` não vem: a invariante `level ≤ maxLevel` (context map:154) é do
   * DOMÍNIO, e mandá-la para a tela convidaria o cliente a validar por conta
   * própria — que é como um cliente vira autoritativo sem ninguém decidir isso.
   */
  readonly departments: readonly {
    readonly kind: string;
    readonly level: number;
    readonly capacity: number;
    readonly condition: number;
  }[];
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
