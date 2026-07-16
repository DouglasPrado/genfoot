/**
 * Leitura de C1 — separada das portas de escrita (R-175).
 *
 * As portas de escrita são estreitas de propósito: carregam UM agregado por
 * `(gameWorldId, id)`. Uma tela precisa do oposto — a lista do mundo. Forçar a
 * query pelas portas de escrita traria de volta o "carregue o mundo inteiro"
 * que a R-175 acabou de matar.
 *
 * Repare que a view expõe `accountId` onde a escrita guarda
 * `worldParticipantId`. Não é inconsistência: é o read model fazendo o trabalho
 * dele. A escrita guarda a FK correta (a conta é global, R-172, e não sabe de
 * mundo); a leitura resolve o join e entrega o que o cliente conhece.
 *
 * DÍVIDA DECLARADA: esta view é grossa — devolve a identidade inteira do mundo
 * porque é o que o `identity-detail` sempre devolveu, e quatro telas do app
 * dependem dessa forma. O `23-rastreabilidade-ux-api.md` especifica ~78 queries
 * FINAS por tela, e é para lá que isto tem de ir. Trocar o modelo de escrita e
 * o contrato de leitura na mesma mudança esconderia qual metade quebrou.
 */
export interface IdentityParticipationView {
  readonly accountId: string;
  readonly status: string;
}

export interface IdentityReservationView {
  readonly id: string;
  readonly accountId: string;
  readonly clubId: string;
  readonly status: string;
}

export interface IdentityControlView {
  readonly id: string;
  readonly accountId: string;
  readonly clubId: string;
  readonly status: string;
}

export interface IdentityCooldownView {
  readonly accountId: string;
  readonly untilOn: string;
}

export interface IdentityWorldView {
  readonly participations: readonly IdentityParticipationView[];
  readonly reservations: readonly IdentityReservationView[];
  readonly controls: readonly IdentityControlView[];
  readonly cooldowns: readonly IdentityCooldownView[];
}

export interface IdentitySummaryView {
  readonly participationCount: number;
  readonly heldReservationCount: number;
  readonly activeControlCount: number;
}

export interface IdentityReadModel {
  worldView(gameWorldId: string): Promise<IdentityWorldView>;
  summary(gameWorldId: string): Promise<IdentitySummaryView>;
}
