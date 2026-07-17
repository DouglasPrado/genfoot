"use client";

import { Trophy } from "lucide-react";
import { useState } from "react";

import type { ClubRow } from "@/components/clubs-table";
import { Mock } from "@/components/mock";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  mockArtilharia,
  mockChave,
  mockEstatisticas,
  mockGarcons,
  mockGrupos,
  mockPremiacao,
  mockTabela,
  mockTorneiosDaTemporada,
  type MockLinhaTabela,
  type MockTorneio,
  type Zona,
} from "@/lib/mock-world";

/**
 * Acompanhamento de competição.
 *
 * INTEIRO mockado — C7 (competições), C5 (partidas) e C4 (jogadores) foram
 * apagados com os mega-agregados (R-175). Os clubes que aparecem nas tabelas são
 * reais (Postgres); tudo que é resultado, gol e prêmio é inventado.
 *
 * O que ela respeita do canon, e não é detalhe:
 *
 * - **O formato decide a tela** (`06-temporada-e-competicoes.md:214-217`). Liga
 *   é turno-e-returno → tabela. Copa é eliminatória → chave. Continental é
 *   grupos por sorteio em potes E DEPOIS mata-mata → as duas coisas, na mesma
 *   competição. Uma tela só, com um layout só, ensinaria que todo torneio é
 *   liga.
 * - **As categorias de prêmio são as do canon** (§7), na ordem dele. Não
 *   inventei nenhuma: elas "afetam reputação e mercado" — inventar categoria é
 *   inventar efeito de jogo.
 * - **Zona é promoção/rebaixamento**, que é parte da virada de temporada (:268).
 *   Em fase de grupos NÃO há rebaixamento: quem fica em 3º está eliminado, e
 *   eliminado não é rebaixado.
 */

const ZONA_COR: Record<Zona, string> = {
  TITULO: "border-l-2 border-l-[color:var(--ok)]",
  CONTINENTAL: "border-l-2 border-l-primary",
  REBAIXAMENTO: "border-l-2 border-l-[color:var(--danger)]",
  NEUTRA: "border-l-2 border-l-transparent",
};

function Standings({
  linhas,
  legenda = true,
}: {
  linhas: readonly MockLinhaTabela[];
  legenda?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-sm border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 font-medium">#</th>
              <th className="px-3 py-2 font-medium">Clube</th>
              <th className="px-3 py-2 text-right font-medium">P</th>
              <th className="px-3 py-2 text-right font-medium">J</th>
              <th className="px-3 py-2 text-right font-medium">V</th>
              <th className="px-3 py-2 text-right font-medium">E</th>
              <th className="px-3 py-2 text-right font-medium">D</th>
              <th className="px-3 py-2 text-right font-medium">GP</th>
              <th className="px-3 py-2 text-right font-medium">GC</th>
              <th className="px-3 py-2 text-right font-medium">SG</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha) => (
              <tr
                key={linha.clubId}
                className={`border-b border-border/60 last:border-0 ${ZONA_COR[linha.zona]}`}
              >
                <td className="mono px-3 py-2 tabular-nums text-muted-foreground">
                  {linha.posicao}
                </td>
                <td className="px-3 py-2 font-medium">
                  <span className="flex items-center gap-2">
                    {linha.zona === "TITULO" ? (
                      <Trophy className="size-3.5 text-[color:var(--ok)]" />
                    ) : null}
                    {linha.clube}
                  </span>
                </td>
                <td className="mono px-3 py-2 text-right font-semibold tabular-nums">
                  {linha.pontos}
                </td>
                <td className="mono px-3 py-2 text-right tabular-nums text-muted-foreground">
                  {linha.jogos}
                </td>
                <td className="mono px-3 py-2 text-right tabular-nums text-muted-foreground">
                  {linha.vitorias}
                </td>
                <td className="mono px-3 py-2 text-right tabular-nums text-muted-foreground">
                  {linha.empates}
                </td>
                <td className="mono px-3 py-2 text-right tabular-nums text-muted-foreground">
                  {linha.derrotas}
                </td>
                <td className="mono px-3 py-2 text-right tabular-nums text-muted-foreground">
                  {linha.golsPro}
                </td>
                <td className="mono px-3 py-2 text-right tabular-nums text-muted-foreground">
                  {linha.golsContra}
                </td>
                <td className="mono px-3 py-2 text-right tabular-nums">
                  {linha.saldo > 0 ? `+${linha.saldo}` : linha.saldo}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {legenda ? (
        <div className="flex flex-wrap gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-0.5 bg-[color:var(--ok)]" /> título
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-0.5 bg-primary" /> vaga continental
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-0.5 bg-[color:var(--danger)]" /> rebaixamento
          </span>
        </div>
      ) : null}
    </div>
  );
}

function Bracket({ torneioId, clubes }: { torneioId: string; clubes: Ref[] }) {
  const fases = mockChave(torneioId, clubes);
  if (fases.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Clubes insuficientes para montar a chave.
      </p>
    );
  }
  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {fases.map((fase) => (
        <div key={fase.nome} className="min-w-[230px] flex-1 space-y-2">
          <div className="font-heading text-xs text-muted-foreground">
            {fase.nome}
          </div>
          {fase.confrontos.map((confronto) => {
            const casaVence =
              confronto.decidido &&
              (confronto.golsCasa ?? 0) >= (confronto.golsFora ?? 0);
            return (
              <div
                key={confronto.id}
                className="rounded-sm border border-border bg-surface-2 text-xs"
              >
                <Side
                  nome={confronto.casa}
                  gols={confronto.golsCasa}
                  vencedor={confronto.decidido && casaVence}
                />
                <div className="border-t border-border/60" />
                <Side
                  nome={confronto.fora}
                  gols={confronto.golsFora}
                  vencedor={confronto.decidido && !casaVence}
                />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function Side({
  nome,
  gols,
  vencedor,
}: {
  nome: string;
  gols: number | null;
  vencedor: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between px-2.5 py-1.5 ${
        vencedor ? "font-semibold text-foreground" : "text-muted-foreground"
      }`}
    >
      <span className="truncate">{nome}</span>
      {/* Confronto não decidido mostra "–", não 0: zero é um placar de verdade e
          diria que o jogo terminou empatado. */}
      <span className="mono tabular-nums">{gols ?? "–"}</span>
    </div>
  );
}

interface Ref {
  readonly id: string;
  readonly name: string;
  readonly shortCode: string;
}

export function CompetitionsPanel({
  worldId,
  clubs,
  temporada,
}: {
  worldId: string;
  clubs: readonly ClubRow[];
  temporada: number;
}) {
  const torneios = mockTorneiosDaTemporada(worldId, temporada);
  const [selecionado, setSelecionado] = useState<string | null>(null);

  if (clubs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Sem clubes — rode a gênese antes.
      </p>
    );
  }

  const torneio: MockTorneio =
    torneios.find((t) => t.id === selecionado) ?? torneios[0]!;
  const refs: Ref[] = clubs.map((c) => ({
    id: c.id,
    name: c.name,
    shortCode: c.shortCode,
  }));

  const temTabela = torneio.formato === "PONTOS_CORRIDOS";
  const temGrupos = torneio.formato === "GRUPOS_E_MATA_MATA";
  const temChave = torneio.formato !== "PONTOS_CORRIDOS";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {torneios.map((t) => (
          <Button
            key={t.id}
            variant={t.id === torneio.id ? "outline" : "ghost"}
            size="sm"
            onClick={() => setSelecionado(t.id)}
          >
            {t.nome}
            {t.emAndamento ? (
              <span className="live-dot ml-1 size-1.5 rounded-full bg-primary" />
            ) : null}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-sm border border-border bg-surface-2 px-3 py-2">
        <span className="font-heading text-sm">{torneio.nome}</span>
        <Badge tone="neutral">{torneio.tipo}</Badge>
        <span className="mono text-[11px] text-muted-foreground">
          {torneio.formato === "PONTOS_CORRIDOS"
            ? "turno e returno"
            : torneio.formato === "GRUPOS_E_MATA_MATA"
              ? "grupos + mata-mata"
              : "eliminatório"}
        </span>
        {torneio.emAndamento ? <Badge tone="live">em andamento</Badge> : null}
        <span className="ml-auto">
          <Mock contexto="C7 + C5 + C4" />
        </span>
      </div>

      <Tabs defaultValue={temTabela ? "tabela" : temGrupos ? "grupos" : "chave"}>
        <TabsList>
          {/* As abas seguem o FORMATO: uma copa não tem tabela, uma liga não tem
              chave. Mostrar aba vazia ensinaria que o torneio tem algo que ele
              não tem. */}
          {temTabela ? <TabsTrigger value="tabela">Tabela</TabsTrigger> : null}
          {temGrupos ? <TabsTrigger value="grupos">Grupos</TabsTrigger> : null}
          {temChave ? <TabsTrigger value="chave">Mata-mata</TabsTrigger> : null}
          <TabsTrigger value="artilharia">Artilharia</TabsTrigger>
          <TabsTrigger value="garcons">Garçons</TabsTrigger>
          <TabsTrigger value="premiacao">Premiação</TabsTrigger>
          <TabsTrigger value="estatisticas">Estatísticas</TabsTrigger>
        </TabsList>

        {temTabela ? (
          <TabsContent value="tabela">
            <Standings linhas={mockTabela(torneio.id, refs)} />
          </TabsContent>
        ) : null}

        {temGrupos ? (
          <TabsContent value="grupos">
            <div className="grid gap-4 lg:grid-cols-2">
              {mockGrupos(torneio.id, refs).map((grupo) => (
                <div key={grupo.nome} className="space-y-1.5">
                  <div className="font-heading text-xs text-muted-foreground">
                    {grupo.nome}
                  </div>
                  <Standings linhas={grupo.linhas} legenda={false} />
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Os 2 primeiros de cada grupo avançam ao mata-mata. Não há
              rebaixamento aqui — quem fica pelo caminho está eliminado, e
              eliminado não é rebaixado.
            </p>
          </TabsContent>
        ) : null}

        {temChave ? (
          <TabsContent value="chave">
            <Bracket torneioId={torneio.id} clubes={refs} />
          </TabsContent>
        ) : null}

        <TabsContent value="artilharia">
          <Ranking linhas={mockArtilharia(torneio.id, refs)} unidade="gols" />
        </TabsContent>

        <TabsContent value="garcons">
          <Ranking
            linhas={mockGarcons(torneio.id, refs)}
            unidade="assistências"
          />
        </TabsContent>

        <TabsContent value="premiacao">
          <div className="overflow-x-auto rounded-sm border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Categoria</th>
                  <th className="px-3 py-2 font-medium">Eleito</th>
                  <th className="px-3 py-2 font-medium">Clube</th>
                </tr>
              </thead>
              <tbody>
                {mockPremiacao(torneio.id, refs).map((premio) => (
                  <tr
                    key={premio.categoria}
                    className="border-b border-border/60 last:border-0"
                  >
                    <td className="px-3 py-2 font-medium">{premio.categoria}</td>
                    <td className="px-3 py-2">{premio.jogador}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {premio.clube}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            As categorias são as do canon (§7 de temporada-e-competições), na
            ordem dele. Prêmio afeta reputação e mercado — inventar categoria
            seria inventar efeito de jogo.
          </p>
        </TabsContent>

        <TabsContent value="estatisticas">
          <Estatisticas torneioId={torneio.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Ranking({
  linhas,
  unidade,
}: {
  linhas: readonly {
    posicao: number;
    jogador: string;
    clube: string;
    valor: number;
    jogos: number;
  }[];
  unidade: string;
}) {
  return (
    <div className="overflow-x-auto rounded-sm border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2 font-medium">#</th>
            <th className="px-3 py-2 font-medium">Jogador</th>
            <th className="px-3 py-2 font-medium">Clube</th>
            <th className="px-3 py-2 text-right font-medium">{unidade}</th>
            <th className="px-3 py-2 text-right font-medium">Jogos</th>
            <th className="px-3 py-2 text-right font-medium">Média</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha) => (
            <tr
              key={linha.jogador}
              className="border-b border-border/60 last:border-0"
            >
              <td className="mono px-3 py-2 tabular-nums text-muted-foreground">
                {linha.posicao}
              </td>
              <td className="px-3 py-2 font-medium">{linha.jogador}</td>
              <td className="px-3 py-2 text-muted-foreground">{linha.clube}</td>
              <td className="mono px-3 py-2 text-right font-semibold tabular-nums">
                {linha.valor}
              </td>
              <td className="mono px-3 py-2 text-right tabular-nums text-muted-foreground">
                {linha.jogos}
              </td>
              <td className="mono px-3 py-2 text-right tabular-nums text-muted-foreground">
                {(linha.valor / linha.jogos).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Estatisticas({ torneioId }: { torneioId: string }) {
  const e = mockEstatisticas(torneioId);
  const itens: readonly [string, string][] = [
    ["Jogos disputados", String(e.jogos)],
    ["Gols", String(e.gols)],
    ["Média de gols por jogo", e.mediaGols.toFixed(2)],
    ["Público médio", e.publicoMedio.toLocaleString("pt-BR")],
    ["Cartões amarelos", String(e.cartoesAmarelos)],
    ["Cartões vermelhos", String(e.cartoesVermelhos)],
    ["Vitórias em casa", `${e.vitoriasCasa}%`],
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {itens.map(([label, valor]) => (
        <div
          key={label}
          className="rounded-sm border border-border bg-surface-2 p-3"
        >
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
          <div className="mono mt-0.5 text-xl tabular-nums">{valor}</div>
        </div>
      ))}
    </div>
  );
}
