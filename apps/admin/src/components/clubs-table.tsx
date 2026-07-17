/**
 * Os clubes do mundo — o único dado REAL do dashboard.
 *
 * `name` e `shortCode` chegam planos porque o read model de C3 resolve o
 * período: o clube não tem nome, tem HISTÓRIA de nomes (BC-003), e a tela não
 * tem por que saber disso.
 */
export interface ClubRow {
  readonly id: string;
  readonly name: string;
  readonly shortCode: string;
  readonly regionId: string;
  readonly status: string;
  readonly reputationBand: number;
  readonly stadiumName: string;
  readonly stadiumCapacity: number;
  readonly primaryColor: string | null;
}

export function ClubsTable({ clubs }: { clubs: readonly ClubRow[] }) {
  // Lista vazia é fato, não erro: mundo sem gênese não tem clube. Preencher com
  // exemplo aqui seria o fallback silencioso que o CLAUDE.md §5 proíbe.
  if (clubs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum clube neste mundo. Rode{" "}
        <span className="mono text-primary">Gerar clubes e ativar</span> — é a
        gênese que os materializa.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-sm border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2 font-medium">Clube</th>
            <th className="px-3 py-2 font-medium">Código</th>
            <th className="px-3 py-2 font-medium">Região</th>
            <th className="px-3 py-2 font-medium">Estádio</th>
            <th className="px-3 py-2 text-right font-medium">Capacidade</th>
            <th className="px-3 py-2 text-right font-medium">Reputação</th>
          </tr>
        </thead>
        <tbody>
          {clubs.map((club) => (
            <tr key={club.id} className="border-b border-border/60 last:border-0">
              <td className="px-3 py-2 font-medium">
                <span className="flex items-center gap-2">
                  {/* Clube gerado nasce SEM identidade visual — o jogador a
                      define ao personalizar (BC-003). Sem cor, sem bolinha: um
                      cinza genérico fingiria que ele já tem cor. */}
                  {club.primaryColor === null ? null : (
                    <span
                      aria-hidden
                      className="size-2.5 shrink-0 rounded-full border border-border"
                      style={{ backgroundColor: club.primaryColor }}
                    />
                  )}
                  {club.name}
                </span>
              </td>
              <td className="mono px-3 py-2 text-muted-foreground">
                {club.shortCode}
              </td>
              <td className="mono px-3 py-2 text-xs text-muted-foreground">
                {club.regionId}
              </td>
              <td className="px-3 py-2 text-muted-foreground">
                {club.stadiumName}
              </td>
              <td className="mono px-3 py-2 text-right tabular-nums text-muted-foreground">
                {club.stadiumCapacity.toLocaleString("pt-BR")}
              </td>
              <td className="mono px-3 py-2 text-right tabular-nums text-muted-foreground">
                {club.reputationBand}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
