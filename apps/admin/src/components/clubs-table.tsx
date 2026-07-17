import { Bot } from "lucide-react";

import { ClubName } from "@/components/club-crest";
import { Mock } from "@/components/mock";
import { mockNumerosDoClube } from "@/lib/mock-world";

/**
 * Os clubes do mundo.
 *
 * `name` e `shortCode` chegam planos porque o read model de C3 resolve o
 * período: o clube não tem nome, tem HISTÓRIA de nomes (BC-003), e a tela não
 * tem por que saber disso.
 *
 * Caixa, folha, elenco e base são MOCK e o cabeçalho da coluna diz isso. O
 * clube NUNCA vai ter esses números como coluna própria: dinheiro é projeção do
 * razão (C9, Decisão 19.10) e elenco é contagem de C4 — "o clube nunca escreve
 * `Player` nem `LedgerEntry`" (context map:78). Quando os contextos voltarem,
 * quem junta isto é o read model, não a tabela `Club`.
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
  readonly secondaryColor: string | null;
  readonly crestTemplateId: string | null;
  /** `null` = IA. Não há flag "isAi": a IA É a ausência de controle (R-180). */
  readonly manager: { readonly accountId: string; readonly name: string } | null;
}

function money(minor: bigint): string {
  return (Number(minor) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

export function ClubsTable({
  worldId,
  clubs,
}: {
  worldId: string;
  clubs: readonly ClubRow[];
}) {
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
            <th className="px-3 py-2 font-medium">Gestor</th>
            <th className="px-3 py-2 text-right font-medium">Capacidade</th>
            <th className="px-3 py-2 text-right font-medium">Reputação</th>
            {/* As quatro colunas mockadas ficam juntas e à direita, com o selo
                no cabeçalho: separadas do que é real, e nomeando o contexto que
                falta. */}
            <th className="whitespace-nowrap px-3 py-2 text-right font-medium">
              <span className="flex items-center justify-end gap-1.5">
                Caixa <Mock contexto="C9" />
              </span>
            </th>
            <th className="whitespace-nowrap px-3 py-2 text-right font-medium">
              <span className="flex items-center justify-end gap-1.5">
                Folha <Mock contexto="C9" />
              </span>
            </th>
            <th className="whitespace-nowrap px-3 py-2 text-right font-medium">
              <span className="flex items-center justify-end gap-1.5">
                Elenco <Mock contexto="C4" />
              </span>
            </th>
            <th className="whitespace-nowrap px-3 py-2 text-right font-medium">
              <span className="flex items-center justify-end gap-1.5">
                Base <Mock contexto="C4" />
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {clubs.map((club) => {
            const n = mockNumerosDoClube(worldId, club.id);
            return (
            <tr
              key={club.id}
              className="border-b border-border/60 even:bg-surface-2/40 last:border-0"
            >
              <td className="px-3 py-2 font-medium">
                <ClubName club={club} size="md" />
              </td>
              <td className="mono px-3 py-2 text-muted-foreground">
                {club.shortCode}
              </td>
              <td className="mono px-3 py-2 text-xs text-muted-foreground">
                {club.regionId}
              </td>
              <td className="px-3 py-2">
                {/* R-180 na tela: sem controle ativo, o clube é da IA. Não é um
                    estado de erro nem "sem dono" — é o estado normal de 15 dos
                    16 clubes de um mundo novo. */}
                {club.manager === null ? (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Bot className="size-3.5 shrink-0" />
                    automático
                  </span>
                ) : (
                  <span className="text-xs">{club.manager.name}</span>
                )}
              </td>
              <td className="mono px-3 py-2 text-right tabular-nums text-muted-foreground">
                {club.stadiumCapacity.toLocaleString("pt-BR")}
              </td>
              <td className="mono px-3 py-2 text-right tabular-nums text-muted-foreground">
                {club.reputationBand}
              </td>
              <td className="mono px-3 py-2 text-right tabular-nums text-[color:var(--warn)]">
                {money(n.caixaMinor)}
              </td>
              <td className="mono px-3 py-2 text-right tabular-nums text-[color:var(--warn)]">
                {money(n.folhaMinor)}
              </td>
              <td className="mono px-3 py-2 text-right tabular-nums text-[color:var(--warn)]">
                {n.elenco}
              </td>
              <td className="mono px-3 py-2 text-right tabular-nums text-[color:var(--warn)]">
                {n.base}
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
