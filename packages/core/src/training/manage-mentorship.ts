import { DomainError, fail, succeed, type Result } from "@grinta/shared";

import {
  deterministicUuidV7,
  timestampOf,
} from "../foundation/deterministic-uuid.js";

import type {
  MentorshipLinkSnapshot,
  MentorshipRepository,
} from "./mentorship-types.js";
import type { TrainingContextReader } from "./training-types.js";

/**
 * Vincular um mentor a um pupilo — command `mentoring:link-mentor` (M-MENTORING).
 *
 * Invariantes duros aqui: ambos no elenco, e mentor ≠ pupilo. A elegibilidade
 * de "veterano" (mais velho/experiente) é guiada pela LEITURA (a tela só oferece
 * mentores elegíveis) — enforcement forte no domínio fica como follow-up.
 */
export interface LinkMentorInput {
  readonly gameWorldId: string;
  readonly clubId: string;
  readonly menteeId: string;
  readonly mentorId: string;
  readonly worldSeed: string;
  readonly occurredOn: string;
  readonly expectedVersion: number | null;
}

export class LinkMentor {
  public constructor(
    private readonly repository: MentorshipRepository,
    private readonly context: TrainingContextReader,
  ) {}

  public async execute(
    input: LinkMentorInput,
  ): Promise<Result<{ readonly link: MentorshipLinkSnapshot }, DomainError>> {
    if (input.menteeId === input.mentorId) {
      return fail(
        new DomainError(
          "MENTOR_INVALID",
          "Um jogador não pode ser mentor de si mesmo.",
          { playerId: input.menteeId },
        ),
      );
    }

    const elenco = new Set(
      await this.context.squadPlayerIds(input.gameWorldId, input.clubId),
    );
    if (!elenco.has(input.menteeId)) {
      return fail(
        new DomainError("PLAYER_NOT_IN_SQUAD", "Pupilo não pertence ao elenco.", {
          playerId: input.menteeId,
        }),
      );
    }
    if (!elenco.has(input.mentorId)) {
      return fail(
        new DomainError("MENTOR_INVALID", "Mentor não pertence ao elenco.", {
          playerId: input.mentorId,
        }),
      );
    }

    const existing = await this.repository.findByMentee(
      input.gameWorldId,
      input.clubId,
      input.menteeId,
    );
    const versaoAtual = existing?.version ?? null;
    if (versaoAtual !== input.expectedVersion) {
      return fail(
        new DomainError(
          "AGGREGATE_VERSION_CONFLICT",
          "O vínculo de mentoria mudou desde a leitura; recarregue e reenvie.",
          { expectedVersion: input.expectedVersion, actualVersion: versaoAtual },
        ),
      );
    }

    const link: MentorshipLinkSnapshot = {
      id:
        existing?.id ??
        deterministicUuidV7({
          worldSeed: input.worldSeed,
          context: `${input.gameWorldId}:mentorship:${input.menteeId}`,
          timestampMilliseconds: timestampOf(input.occurredOn),
        }),
      gameWorldId: input.gameWorldId,
      clubId: input.clubId,
      menteeId: input.menteeId,
      mentorId: input.mentorId,
      version: (versaoAtual ?? 0) + 1,
    };
    await this.repository.save(link, versaoAtual);
    return succeed({ link });
  }
}

/** Desvincular o mentor de um pupilo — command `mentoring:unlink-mentor`. */
export interface UnlinkMentorInput {
  readonly gameWorldId: string;
  readonly clubId: string;
  readonly menteeId: string;
}

export class UnlinkMentor {
  public constructor(private readonly repository: MentorshipRepository) {}

  public async execute(
    input: UnlinkMentorInput,
  ): Promise<Result<{ readonly removed: boolean }, DomainError>> {
    const existing = await this.repository.findByMentee(
      input.gameWorldId,
      input.clubId,
      input.menteeId,
    );
    // Idempotente: desvincular quem não tem mentor é sucesso, não erro.
    if (existing === null) return succeed({ removed: false });
    await this.repository.remove(
      input.gameWorldId,
      input.clubId,
      input.menteeId,
    );
    return succeed({ removed: true });
  }
}
