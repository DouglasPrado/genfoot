/**
 * Diretório de usuários do A-IAM: junta, por mundo, conta → controle ativo →
 * clube → saldo. Só dados oficiais das queries `identity-detail`, `club` e
 * `ledger` — a tabela não inventa: clube ausente é null, saldo desconhecido é
 * null (não zero).
 *
 * O "usuário" aqui é o subject do provedor (R-171), extraído da idempotencyKey
 * que o app grava (`mobile-account:<subject>`). E-mail/nome vivem no Clerk e
 * não passam pela API do jogo — a coluna mostra o id estável.
 */

export interface WorldSlice {
  readonly worldId: string;
  readonly worldSeed: string;
  readonly identity: {
    readonly accounts?: readonly {
      readonly id: string;
      readonly idempotencyKey: string;
      readonly status: string;
    }[];
    readonly controls: readonly {
      readonly id: string;
      readonly accountId: string;
      readonly clubId: string;
      readonly status: string;
    }[];
  } | null;
  readonly clubs: {
    readonly clubs: readonly {
      readonly id: string;
      readonly identity: { readonly name: string };
    }[];
  } | null;
  readonly ledger: {
    readonly clubBalances: readonly {
      readonly clubId: string;
      readonly balanceMinor: number;
    }[];
  } | null;
}

export interface UserRow {
  readonly subject: string;
  readonly accountId: string;
  readonly accountStatus: string;
  readonly worldId: string;
  readonly worldSeed: string;
  readonly clubId: string | null;
  readonly clubName: string | null;
  readonly balanceMinor: number | null;
}

const ACCOUNT_KEY_PREFIX = "mobile-account:";

export function subjectFromIdempotencyKey(key: string): string {
  return key.startsWith(ACCOUNT_KEY_PREFIX)
    ? key.slice(ACCOUNT_KEY_PREFIX.length)
    : key;
}

export function buildUserDirectory(
  slices: readonly WorldSlice[],
): readonly UserRow[] {
  const rows: UserRow[] = [];

  for (const slice of slices) {
    const accounts = slice.identity?.accounts ?? [];
    const controls = slice.identity?.controls ?? [];
    const clubById = new Map(
      (slice.clubs?.clubs ?? []).map((club) => [club.id, club]),
    );
    const balanceByClub = new Map(
      (slice.ledger?.clubBalances ?? []).map((entry) => [
        entry.clubId,
        entry.balanceMinor,
      ]),
    );

    for (const account of accounts) {
      const control = controls.find(
        (candidate) =>
          candidate.accountId === account.id && candidate.status === "ACTIVE",
      );
      const club =
        control === undefined ? undefined : clubById.get(control.clubId);
      const balance =
        control === undefined
          ? undefined
          : balanceByClub.get(control.clubId);

      rows.push({
        subject: subjectFromIdempotencyKey(account.idempotencyKey),
        accountId: account.id,
        accountStatus: account.status,
        worldId: slice.worldId,
        worldSeed: slice.worldSeed,
        clubId: control?.clubId ?? null,
        clubName: club?.identity.name ?? null,
        balanceMinor: balance ?? null,
      });
    }
  }

  return rows;
}
