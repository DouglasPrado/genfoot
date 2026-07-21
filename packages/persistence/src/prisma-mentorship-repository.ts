import type {
  MentorshipLinkSnapshot,
  MentorshipRepository,
} from "@grinta/core";

import type { Prisma } from "./generated/prisma/client.js";

/**
 * O vínculo de mentoria em Postgres (M-MENTORING). `save` usa `updateMany` com a
 * versão esperada no WHERE — concorrência otimista no banco, como os demais.
 */
interface Row {
  readonly id: string;
  readonly gameWorldId: string;
  readonly clubId: string;
  readonly menteeId: string;
  readonly mentorId: string;
  readonly version: number;
}

const toSnapshot = (row: Row): MentorshipLinkSnapshot => ({
  id: row.id,
  gameWorldId: row.gameWorldId,
  clubId: row.clubId,
  menteeId: row.menteeId,
  mentorId: row.mentorId,
  version: row.version,
});

export class PrismaMentorshipRepository implements MentorshipRepository {
  public constructor(private readonly client: Prisma.TransactionClient) {}

  public async findByMentee(
    gameWorldId: string,
    clubId: string,
    menteeId: string,
  ): Promise<MentorshipLinkSnapshot | null> {
    const row = await this.client.mentorship.findFirst({
      where: { gameWorldId, clubId, menteeId },
    });
    return row === null ? null : toSnapshot(row);
  }

  public async findAllActive(
    gameWorldId: string,
  ): Promise<readonly MentorshipLinkSnapshot[]> {
    const rows = await this.client.mentorship.findMany({ where: { gameWorldId } });
    return rows.map(toSnapshot);
  }

  public async remove(
    gameWorldId: string,
    clubId: string,
    menteeId: string,
  ): Promise<void> {
    await this.client.mentorship.deleteMany({
      where: { gameWorldId, clubId, menteeId },
    });
  }

  public async save(
    link: MentorshipLinkSnapshot,
    expectedVersion: number | null,
  ): Promise<void> {
    if (expectedVersion === null) {
      await this.client.mentorship.create({
        data: {
          id: link.id,
          gameWorldId: link.gameWorldId,
          clubId: link.clubId,
          menteeId: link.menteeId,
          mentorId: link.mentorId,
          version: link.version,
        },
      });
      return;
    }
    const updated = await this.client.mentorship.updateMany({
      where: { id: link.id, version: expectedVersion },
      data: { mentorId: link.mentorId, version: link.version },
    });
    if (updated.count === 0) {
      throw new Error(
        `AGGREGATE_VERSION_CONFLICT: vínculo ${link.id} não está na versão ${expectedVersion}.`,
      );
    }
  }
}
