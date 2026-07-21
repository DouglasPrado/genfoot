/**
 * Modelo puro da MENTORIA (M-MENTORING).
 *
 * A tela vincula um mentor (veterano) a um pupilo. Este módulo decide quem é
 * mentor ELEGÍVEL (mais velho que o pupilo — "veterano", o que o doc pede) e
 * monta os payloads de vincular/desvincular. O domínio recusaria mentor=pupilo
 * ou fora do elenco; aqui a lista já só oferece quem é válido.
 */

export interface MentorCandidate {
  readonly playerId: string;
  readonly name: string;
  readonly primaryPosition: string;
  readonly overall: number;
  readonly age: number;
}

/**
 * Mentores elegíveis para um pupilo: do elenco, distintos do pupilo e MAIS
 * VELHOS (veteranos). Ordenados por idade desc — o mais experiente primeiro.
 */
export function eligibleMentors(
  players: readonly MentorCandidate[],
  menteeId: string,
  menteeAge: number,
): readonly MentorCandidate[] {
  return players
    .filter((p) => p.playerId !== menteeId && p.age > menteeAge)
    .slice()
    .sort((a, b) => b.age - a.age);
}

export interface LinkMentorPayload {
  readonly clubId: string;
  readonly menteeId: string;
  readonly mentorId: string;
  readonly expectedVersion: number | null;
}

export function buildLinkMentorPayload(input: {
  readonly clubId: string;
  readonly menteeId: string;
  readonly mentorId: string | null;
  readonly expectedVersion: number | null;
}): LinkMentorPayload | { readonly error: "NO_MENTOR" | "SELF" } {
  if (input.mentorId === null || input.mentorId === "") return { error: "NO_MENTOR" };
  if (input.mentorId === input.menteeId) return { error: "SELF" };
  return {
    clubId: input.clubId,
    menteeId: input.menteeId,
    mentorId: input.mentorId,
    expectedVersion: input.expectedVersion,
  };
}

export interface UnlinkMentorPayload {
  readonly clubId: string;
  readonly menteeId: string;
}

export function buildUnlinkMentorPayload(input: {
  readonly clubId: string;
  readonly menteeId: string;
}): UnlinkMentorPayload {
  return { clubId: input.clubId, menteeId: input.menteeId };
}
