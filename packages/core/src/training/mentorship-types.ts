/**
 * Mentoria (M-MENTORING) — tipos e portas.
 *
 * Um veterano/líder mentora um pupilo, e a virada do dia dá ao pupilo uma
 * evolução ACELERADA (doc de tela: "acelerar o desenvolvimento com
 * veteranos/líderes"; regras de jogo: "técnico mentor → evolução acelerada").
 * Um mentor por pupilo (chave `gameWorldId`+`menteeId`); `version` para a
 * concorrência otimista, como os demais planos.
 */

/** Bônus diário de desenvolvimento do pupilo — +1 na recomendada mais fraca da
 * posição (evolução acelerada). Flat por ora; escalar pela qualidade do mentor
 * é follow-up. VAL-001. */
export const MENTOR_DAILY_BONUS = 1;

export interface MentorshipLinkSnapshot {
  readonly id: string;
  readonly gameWorldId: string;
  readonly clubId: string;
  /** O pupilo — quem recebe a evolução acelerada. */
  readonly menteeId: string;
  /** O mentor — veterano/líder. */
  readonly mentorId: string;
  readonly version: number;
}

export interface MentorshipRepository {
  findByMentee(
    gameWorldId: string,
    clubId: string,
    menteeId: string,
  ): Promise<MentorshipLinkSnapshot | null>;
  save(
    link: MentorshipLinkSnapshot,
    expectedVersion: number | null,
  ): Promise<void>;
  remove(gameWorldId: string, clubId: string, menteeId: string): Promise<void>;
  /** Todos os vínculos do mundo — o settle da virada percorre. */
  findAllActive(
    gameWorldId: string,
  ): Promise<readonly MentorshipLinkSnapshot[]>;
}
