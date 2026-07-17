/**
 * Diretório de usuários: junta, por mundo, participação → controle ativo →
 * clube.
 *
 * **Estava sempre vazio, e ninguém tinha visto.** Ele lia
 * `identity.accounts[].idempotencyKey`, e o read model de C1 (R-175) não tem
 * `accounts` — tem `participations`. Como o campo era opcional, o `?? []`
 * engolia a divergência em silêncio e a tabela renderizava zero linha sem erro
 * nenhum. É o tipo de defeito que só aparece quando alguém abre a tela.
 *
 * O identificador do usuário é o `accountId` (uuid da conta global, R-172). O
 * `subject` do provedor NÃO passa mais por aqui: ele era extraído da
 * `idempotencyKey` que o app gravava (`mobile-account:<subject>`), e essa chave
 * deixou de ser estado do agregado (R-176) — virou `attemptKey`, semente de id,
 * que o read model não expõe nem deve. Nome e e-mail vivem no Clerk.
 *
 * O saldo é MOCK e está marcado como tal na tela: C9 (razão) foi apagado com os
 * mega-agregados, e balanço é projeção do razão (Decisão 19.10) — não há de onde
 * tirar. Saldo desconhecido nunca vira zero: zero é uma afirmação.
 */

export interface WorldSlice {
  readonly worldId: string;
  readonly worldSeed: string;
  readonly identity: {
    readonly participations: readonly {
      readonly accountId: string;
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
    readonly clubs: readonly ClubIdentity[];
  } | null;
}

/** O clube com a identidade visual junto: o escudo anda com o nome. */
export interface ClubIdentity {
  readonly id: string;
  readonly name: string;
  readonly shortCode: string;
  readonly primaryColor: string | null;
  readonly secondaryColor: string | null;
  readonly crestTemplateId: string | null;
}

export interface UserRow {
  readonly accountId: string;
  readonly accountStatus: string;
  readonly worldId: string;
  readonly worldSeed: string;
  readonly clubId: string | null;
  readonly club: ClubIdentity | null;
}

export function buildUserDirectory(
  slices: readonly WorldSlice[],
): readonly UserRow[] {
  const rows: UserRow[] = [];

  for (const slice of slices) {
    const participations = slice.identity?.participations ?? [];
    const controls = slice.identity?.controls ?? [];
    const clubById = new Map(
      (slice.clubs?.clubs ?? []).map((club) => [club.id, club]),
    );

    for (const participation of participations) {
      // Só o controle ATIVO conta: quem largou o clube continua participando do
      // mundo, e some da coluna de clube — não da lista.
      const control = controls.find(
        (candidate) =>
          candidate.accountId === participation.accountId &&
          candidate.status === "ACTIVE",
      );
      const club =
        control === undefined ? undefined : clubById.get(control.clubId);

      rows.push({
        accountId: participation.accountId,
        accountStatus: participation.status,
        worldId: slice.worldId,
        worldSeed: slice.worldSeed,
        clubId: control?.clubId ?? null,
        // Clube ausente é null, nunca "—" nem string vazia: quem decide como
        // mostrar ausência é a tela, não o modelo.
        club: club ?? null,
      });
    }
  }

  return rows;
}
