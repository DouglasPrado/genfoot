"use client";

import { useState } from "react";

import type { ClubRow } from "@/components/clubs-table";
import { Button } from "@/components/ui/button";
import { mockTemporadasDoClube } from "@/lib/mock-world";

/**
 * Resultado de todas as temporadas de todos os clubes.
 *
 * INTEIRO mockado (C7 competições + C5 partidas). Os clubes da esquerda são
 * reais — vêm do Postgres —, mas cada linha de campanha é inventada: não há
 * `Season`, `Match` nem `ClubSeasonStats` em lugar nenhum.
 *
 * Fica assim de propósito: quando C7 voltar, troca-se `mockTemporadasDoClube`
 * pela query e o compilador aponta o que muda. O `Mock` no cabeçalho do card é
 * que diz ao operador para não decidir nada com estes números.
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

  const clubeAtual = clubs.find((c) => c.id === selecionado) ?? clubs[0]!;
  const campanhas = mockTemporadasDoClube(worldId, clubeAtual.id, ateTemporada);

  return (
    <div className="grid gap-4 md:grid-cols-[220px_1fr]">
      <div className="flex max-h-80 flex-col gap-1 overflow-y-auto rounded-sm border border-border p-1">
        {clubs.map((club) => (
          <Button
            key={club.id}
            variant={club.id === clubeAtual.id ? "outline" : "ghost"}
            size="sm"
            className="justify-start"
            onClick={() => setSelecionado(club.id)}
          >
            <span className="mono text-[10px] text-muted-foreground">
              {club.shortCode}
            </span>
            <span className="truncate">{club.name}</span>
          </Button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-sm border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 font-medium">Temporada</th>
              <th className="px-3 py-2 text-right font-medium">Posição</th>
              <th className="px-3 py-2 text-right font-medium">Pontos</th>
              <th className="px-3 py-2 text-right font-medium">V</th>
              <th className="px-3 py-2 text-right font-medium">E</th>
              <th className="px-3 py-2 text-right font-medium">D</th>
            </tr>
          </thead>
          <tbody>
            {campanhas.map((campanha) => (
              <tr
                key={campanha.temporada}
                className="border-b border-border/60 last:border-0"
              >
                <td className="px-3 py-2 font-medium">
                  Temporada {campanha.temporada}
                </td>
                <td className="mono px-3 py-2 text-right tabular-nums">
                  {campanha.posicao}º
                </td>
                <td className="mono px-3 py-2 text-right tabular-nums font-semibold">
                  {campanha.pontos}
                </td>
                <td className="mono px-3 py-2 text-right tabular-nums text-muted-foreground">
                  {campanha.vitorias}
                </td>
                <td className="mono px-3 py-2 text-right tabular-nums text-muted-foreground">
                  {campanha.empates}
                </td>
                <td className="mono px-3 py-2 text-right tabular-nums text-muted-foreground">
                  {campanha.derrotas}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
