"use client";

import { Trophy } from "lucide-react";
import { useState } from "react";

import { ClubCrest, ClubName } from "@/components/club-crest";
import type { ClubRow } from "@/components/clubs-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mockCampanhasDoClube, type MockCampanha } from "@/lib/mock-world";

/**
 * As campanhas de um clube, temporada a temporada.
 *
 * **Uma temporada tem VÁRIOS torneios.** O modelo anterior dava uma linha por
 * temporada com posição e pontos — isso só descreve uma liga, e o canon é
 * explícito: "a temporada contém pré-temporada, mercado inicial, campeonato
 * principal, COPAS…" (`00-gdd-overview.md:168`), com sete tipos de campeonato
 * (`06-temporada-e-competicoes.md:131`).
 *
 * Por isso a tabela agrupa por temporada e lista os torneios dentro. E o
 * formato decide o que a linha significa: liga tem posição e pontos, mata-mata
 * tem FASE. Numa copa eliminatória "posição" não é zero, é pergunta que não se
 * faz — e um zero ali diria "terminou em último".
 *
 * Tudo mockado (C7 competições + C5 partidas). Os clubes da esquerda são reais.
 */
export function SeasonHistory({
  worldId,
  clubs,
  ateTemporada,
}: {
  worldId: string;
  clubs: readonly ClubRow[];
  ateTemporada: number;
}) {
  const [selecionado, setSelecionado] = useState<string | null>(null);

  if (clubs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Sem clubes — rode a gênese antes.
      </p>
    );
  }

  const clube = clubs.find((c) => c.id === selecionado) ?? clubs[0]!;
  const campanhas = mockCampanhasDoClube(worldId, clube.id, ateTemporada);
  const porTemporada = new Map<number, MockCampanha[]>();
  for (const campanha of campanhas) {
    const lista = porTemporada.get(campanha.torneio.temporada) ?? [];
    lista.push(campanha);
    porTemporada.set(campanha.torneio.temporada, lista);
  }
  const titulos = campanhas.filter((c) => c.campeao).length;

  return (
    <div className="grid gap-4 md:grid-cols-[220px_1fr]">
      <div className="flex max-h-[28rem] flex-col gap-1 overflow-y-auto rounded-sm border border-border p-1">
        {clubs.map((c) => (
          <Button
            key={c.id}
            variant={c.id === clube.id ? "outline" : "ghost"}
            size="sm"
            className="justify-start"
            onClick={() => setSelecionado(c.id)}
          >
            <ClubCrest club={c} />
            <span className="truncate">{c.name}</span>
          </Button>
        ))}
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="font-heading flex items-center gap-2 text-base">
            <ClubCrest club={clube} size="lg" />
            {clube.name}
          </span>
          <Badge tone={titulos > 0 ? "ok" : "neutral"}>
            <Trophy className="size-3" />
            {titulos} {titulos === 1 ? "título" : "títulos"}
          </Badge>
          <span className="mono text-xs text-muted-foreground">
            {campanhas.length} campanhas em {porTemporada.size} temporadas
          </span>
        </div>

        {[...porTemporada.entries()]
          .sort(([a], [b]) => b - a)
          .map(([temporada, lista]) => (
            <div
              key={temporada}
              className="overflow-x-auto rounded-sm border border-border"
            >
              <div className="flex items-center justify-between border-b border-border bg-surface-2 px-3 py-1.5">
                <span className="font-heading text-xs">
                  Temporada {temporada}
                </span>
                <span className="mono text-[11px] text-muted-foreground">
                  {lista.length} torneios
                </span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Torneio</th>
                    <th className="px-3 py-2 font-medium">Tipo</th>
                    <th className="px-3 py-2 font-medium">Resultado</th>
                    <th className="px-3 py-2 text-right font-medium">Pontos</th>
                    <th className="px-3 py-2 text-right font-medium">V</th>
                    <th className="px-3 py-2 text-right font-medium">E</th>
                    <th className="px-3 py-2 text-right font-medium">D</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map((campanha) => (
                    <tr
                      key={campanha.torneio.id}
                      className="border-b border-border/60 even:bg-surface-2/40 last:border-0"
                    >
                      <td className="px-3 py-2 font-medium">
                        <span className="flex items-center gap-2">
                          {campanha.torneio.nome}
                          {campanha.campeao ? (
                            <Trophy className="size-3.5 shrink-0 text-[color:var(--ok)]" />
                          ) : null}
                          {campanha.torneio.emAndamento ? (
                            <Badge tone="live">em andamento</Badge>
                          ) : null}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {campanha.torneio.tipo}
                      </td>
                      <td className="px-3 py-2">
                        {/* Liga: posição. Mata-mata: fase. O formato decide o
                            que a coluna quer dizer. */}
                        {campanha.posicao !== null
                          ? `${campanha.posicao}º lugar`
                          : campanha.faseAlcancada}
                      </td>
                      <td className="mono px-3 py-2 text-right tabular-nums font-semibold">
                        {/* `—` e não `0`: em mata-mata não há pontuação, e um
                            zero afirmaria que o clube não pontuou. */}
                        {campanha.pontos ?? "—"}
                      </td>
                      <td className="mono px-3 py-2 text-right tabular-nums text-muted-foreground">
                        {campanha.vitorias}
                      </td>
                      <td className="mono px-3 py-2 text-right tabular-nums text-muted-foreground">
                        {campanha.torneio.formato === "MATA_MATA"
                          ? "—"
                          : campanha.empates}
                      </td>
                      <td className="mono px-3 py-2 text-right tabular-nums text-muted-foreground">
                        {campanha.derrotas}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
      </div>
    </div>
  );
}
