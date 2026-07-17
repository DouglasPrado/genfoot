import type { NewDomainEvent } from "../foundation/domain-event-log.js";

import type { VisualIdentitySnapshot } from "./club-types.js";

/**
 * Eventos de C3 (R-176). União discriminada com payload TIPADO.
 *
 * O `ClubDomainEvent` que isto substitui era `type: string` livre + `payload:
 * Record<string, unknown>` (`club-types.ts:159,168`). Dois estilos incompatíveis
 * conviviam no mesmo core, e a R-176 escolheu este: payload opaco não se valida
 * nem se reconstrói, e quebra o replay determinístico.
 *
 * **Os nomes são os do catálogo, não os meus.** Eu ia chamar de
 * `ClubIdentityChanged`; `10-catalogo-de-commands.md:390` diz
 * `ClubIdentityApplied` **(+ `ClubIdentityPeriodOpened` quando muda identidade
 * oficial)`. É a mesma armadilha do `IDEMPOTENCY_KEY_CONFLICT`, que o domínio
 * inventou e o canon nunca conheceu.
 *
 * E a distinção do catálogo é real, não burocracia:
 *
 * - **`ClubIdentityApplied`** — cosmético, "sem efeito esportivo" (`:387`).
 *   Trocar o escudo não muda quem o clube é.
 * - **`ClubIdentityPeriodOpened`** — a identidade OFICIAL mudou: nome ou
 *   código. Isso abre um período novo (BC-003), e é o que a torcida (C10), a
 *   narrativa (C11) e a unicidade de nome enxergam.
 *
 * Um rebranding que troca nome E escudo emite os DOIS: são dois fatos, e quem
 * consome um não consome o outro.
 */
export const ClubEventType = {
  CLUB_IDENTITY_APPLIED: "ClubIdentityApplied",
} as const;

export type ClubEventType = (typeof ClubEventType)[keyof typeof ClubEventType];

/**
 * O agregado sobre o qual C3 emite evento: o CLUBE.
 *
 * **`ClubIdentityPeriod` não vira aggregateType, e o motivo custou dois bugs.**
 *
 * O catálogo (`:390`) promete dois eventos: `ClubIdentityApplied` +
 * `ClubIdentityPeriodOpened`. Tentei entregar os dois, e o log recusou: ele tem
 * `@@unique([gameWorldId, aggregateType, aggregateId, aggregateVersion])`
 * (R-176) — um evento por versão de agregado. Dois eventos sobre o clube, na
 * mesma versão, são duas histórias.
 *
 * A saída óbvia seria dizer que o período é outro agregado — o context map:77 o
 * lista como root. Não é: **ele não tem coluna `version`**. E pela régua que a
 * R-183 estabeleceu — root é o que precisa de fronteira própria por CONTENÇÃO —
 * ele não é mesmo: ninguém disputa o período de um clube com outro clube, e
 * `Club.updateIdentity` o muta de dentro. É a mesma lista feita por vocabulário
 * que já tinha promovido departamento e estádio.
 *
 * E o teste provou: rebranding no mesmo dia SUBSTITUI o período (5f1c654) —
 * mesmo id, mesma "versão 1". Dois `ClubIdentityPeriodOpened` para o mesmo
 * período. Um root de verdade não tem duas versões 1.
 *
 * Então é UM fato: a identidade do clube mudou. `periodOpened` no payload diz se
 * a identidade OFICIAL mudou (nome/código) ou se foi só cosmético — que é a
 * distinção que o catálogo queria, sem inventar um root que o físico não tem.
 */
export const ClubAggregateType = {
  CLUB: "Club",
} as const;

export type ClubAggregateType =
  (typeof ClubAggregateType)[keyof typeof ClubAggregateType];

/**
 * A identidade do clube mudou.
 *
 * `previous*` viaja junto porque o evento tem de bastar para reconstruir a
 * história: quem lê o log meses depois precisa saber DE QUE nome o clube veio, e
 * buscar no período anterior obrigaria o leitor a reidratar o agregado.
 */
export interface ClubIdentityAppliedPayload extends Record<string, unknown> {
  readonly clubId: string;
  readonly identityPeriodId: string;
  /**
   * A identidade OFICIAL mudou (nome/código) — e não só o visual.
   *
   * É a distinção que o catálogo expressava com um segundo evento
   * (`ClubIdentityPeriodOpened`): trocar o escudo é cosmético, "sem efeito
   * esportivo" (`:387`); trocar o nome abre período, e é isso que a torcida
   * (C10), a narrativa (C11) e a unicidade de nome enxergam.
   */
  readonly periodOpened: boolean;
  readonly previousName: string;
  readonly name: string;
  readonly previousShortCode: string;
  readonly shortCode: string;
  readonly effectiveFrom: string;
  readonly visualIdentity: VisualIdentitySnapshot | null;
  /** O que mudou de fato: trocar só o escudo não é trocar as cores. */
  readonly changedFields: readonly string[];
}

/**
 * A identidade OFICIAL mudou.
 *
 * `previous*` viaja junto porque o evento tem de bastar para reconstruir a
 * história: quem lê o log meses depois precisa saber DE QUE nome o clube veio, e
 * buscar no período anterior obrigaria o leitor a reidratar o agregado.
 */
export interface ClubEventInput {
  readonly eventId: string;
  readonly gameWorldId: string;
  readonly aggregateType: ClubAggregateType;
  readonly aggregateId: string;
  readonly aggregateVersion: number;
  readonly eventType: ClubEventType;
  readonly payload: ClubIdentityAppliedPayload;
  readonly occurredOn: string;
  readonly actorId: string | null;
  readonly correlationId: string | null;
  readonly causationId: string | null;
}

/**
 * Monta o envelope que o log espera. `aggregateVersion` vem do agregado — é a
 * versão DEPOIS do comando, e é ela que o unique do log usa para recusar duas
 * histórias na mesma versão.
 */
export function clubEvent(input: ClubEventInput): NewDomainEvent {
  return {
    eventId: input.eventId,
    gameWorldId: input.gameWorldId,
    aggregateType: input.aggregateType,
    aggregateId: input.aggregateId,
    aggregateVersion: BigInt(input.aggregateVersion),
    eventType: input.eventType,
    eventVersion: 1,
    payload: input.payload,
    actorType: input.actorId === null ? "SYSTEM" : "USER",
    actorId: input.actorId,
    correlationId: input.correlationId,
    causationId: input.causationId,
    occurredOn: input.occurredOn,
  };
}
