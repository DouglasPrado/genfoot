/**
 * Nome e descrição do mundo, do lado da tela.
 *
 * O trabalho aqui é o `null` vs `undefined` do command: `world:set-identity` é um
 * update parcial, onde **campo ausente = não mexa** e **`null` = limpe**. A tela
 * só sabe de string vazia, então a tradução mora neste módulo — e ela não é
 * óbvia: apagar o texto de um campo preenchido é `null`, mas um campo que já era
 * vazio e segue vazio não é mudança nenhuma.
 *
 * Sem essa distinção, abrir a tela de um mundo sem nome e clicar em Salvar
 * mandaria `{name: null}`: um command que não muda nada, gasta uma revisão do
 * lock otimista e polui o log de eventos.
 */

/** Os limites do domínio (`world-types.ts`). Divergir faz a tela mentir. */
export const NAME_MAX = 60;
export const DESCRIPTION_MAX = 500;

export interface WorldIdentity {
  readonly name: string | null;
  readonly description: string | null;
  readonly bannerKey: string | null;
  readonly squarePhotoKey: string | null;
}

/** O que está nos inputs — a tela só conhece string. */
export interface IdentityDraft {
  readonly name: string;
  readonly description: string;
  /** A chave que o upload devolveu. `null` = sem imagem. */
  readonly bannerKey: string | null;
  readonly squarePhotoKey: string | null;
}

/**
 * `type`, não `interface`, de propósito: o `payload` do client é
 * `Record<string, unknown>`, e uma `interface` não satisfaz índice implícito —
 * ela pode ser aumentada depois, então o TS recusa. Type alias é fechado e passa.
 */
export type IdentityPayload = {
  readonly name?: string | null;
  readonly description?: string | null;
  readonly bannerKey?: string | null;
  readonly squarePhotoKey?: string | null;
};

export interface IdentityViolation {
  readonly field: "name" | "description";
  readonly message: string;
}

/** Vazio e só-espaço são a mesma coisa: ausência. O domínio apara igual. */
function normalize(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * O payload parcial do que mudou, ou `null` se nada mudou.
 *
 * Compara APARADO contra APARADO: o mesmo texto com espaço a mais não é edição.
 */
export function identityPayload(
  current: WorldIdentity,
  draft: IdentityDraft,
): IdentityPayload | null {
  const payload: {
    name?: string | null;
    description?: string | null;
    bannerKey?: string | null;
    squarePhotoKey?: string | null;
  } = {};

  const name = normalize(draft.name);
  if (name !== current.name) payload.name = name;

  const description = normalize(draft.description);
  if (description !== current.description) payload.description = description;

  // As imagens já vêm como chave ou null do campo de upload — não há texto para
  // aparar. Comparação direta.
  if (draft.bannerKey !== current.bannerKey) payload.bannerKey = draft.bannerKey;
  if (draft.squarePhotoKey !== current.squarePhotoKey) {
    payload.squarePhotoKey = draft.squarePhotoKey;
  }

  return Object.keys(payload).length === 0 ? null : payload;
}

/**
 * O que o domínio recusaria, dito antes do clique.
 *
 * A tela não é a autoridade — o agregado valida de novo e é ele quem manda. Isto
 * existe para o operador não descobrir o limite por `INVALID_WORLD_NAME`.
 */
export function identityViolations(
  draft: IdentityDraft,
): readonly IdentityViolation[] {
  const violations: IdentityViolation[] = [];

  // Mede o aparado, como o domínio: medir o cru barraria nome que o servidor
  // aceita.
  if (draft.name.trim().length > NAME_MAX) {
    violations.push({
      field: "name",
      message: `O nome passa de ${NAME_MAX} caracteres.`,
    });
  }
  if (draft.description.trim().length > DESCRIPTION_MAX) {
    violations.push({
      field: "description",
      message: `A descrição passa de ${DESCRIPTION_MAX} caracteres.`,
    });
  }

  return violations;
}
