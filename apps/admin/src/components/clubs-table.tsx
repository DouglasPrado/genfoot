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
 * Caixa e Folha SAÍRAM do mock: vêm da query `finance-snapshot` (C9) — caixa é o
 * saldo derivado do razão (INV-8) e folha é o custo de temporada do elenco +
 * estrutura. O clube não escreve esses números como coluna própria: quem os
 * junta é o read model de finanças, não a tabela `Club` ("o clube nunca escreve
 * `Player` nem `LedgerEntry`", context map:78).
 *
 * Elenco e Base ainda são MOCK (C4) e o cabeçalho da coluna diz isso — a
 * contagem de jogadores/base sai de C4, que não tem read model materializado.
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

/**
 * O recorte de `finance-snapshot` (C9) que a tabela usa: caixa e folha por
 * clube, em unidade mínima. `null` na chave = clube sem finanças materializadas;
 * o Map ausente = ainda carregando.
 */
export interface ClubFinanceRow {
  readonly cashMinor: number;
  readonly seasonCostMinor: number;
}

/** Aceita `bigint` (mock C4) e `number` (finance-snapshot, número seguro). */
function money(minor: number | bigint): string {
  return (Number(minor) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

export function ClubsTable({
  worldId,
  clubs,
  finances,
}: {
  worldId: string;
  clubs: readonly ClubRow[];
  /** `null` enquanto carrega; `Map` com chave `null` = clube sem finanças. */
  finances: ReadonlyMap<string, ClubFinanceRow | null> | null;
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
            {/* Caixa e Folha são reais (C9 finance-snapshot) — sem selo. Elenco
                e Base seguem mockadas (C4), com o selo nomeando o contexto que
                falta. */}
            <th className="whitespace-nowrap px-3 py-2 text-right font-medium">
              Caixa
            </th>
            <th className="whitespace-nowrap px-3 py-2 text-right font-medium">
              Folha
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
            // Caixa/Folha reais: `undefined` = ainda carregando (mostra "…");
            // `null` = clube sem finanças materializadas (mostra "—").
            const finance = finances?.get(club.id);
            const loadingFinance = finances === null;
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
              <td className="mono px-3 py-2 text-right tabular-nums text-muted-foreground">
                {loadingFinance
                  ? "…"
                  : finance == null
                    ? "—"
                    : money(finance.cashMinor)}
              </td>
              <td className="mono px-3 py-2 text-right tabular-nums text-muted-foreground">
                {loadingFinance
                  ? "…"
                  : finance == null
                    ? "—"
                    : money(finance.seasonCostMinor)}
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
