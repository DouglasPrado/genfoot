"use client";

import { Trophy } from "lucide-react";
import { useState } from "react";

import { ClubCrest, ClubName } from "@/components/club-crest";
import type { ClubRow } from "@/components/clubs-table";
import { Mock } from "@/components/mock";
import { PositionBadge } from "@/components/position-badge";
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
  mockPremiacaoDinheiro,
  FINANCIAL_WEIGHT,
  REPUTATION_WEIGHT,
  mockTabela,
  mockTorneiosDaTemporada,
  type ClubeRef,
  type MockConfronto,
  type MockJogadorRanking,
  type MockFaseMataMata,
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
                key={linha.clube.id}
                className={`border-b border-border/60 even:bg-surface-2/40 last:border-0 ${ZONA_COR[linha.zona]}`}
              >
                <td className="mono px-3 py-2 tabular-nums text-muted-foreground">
                  {linha.posicao}
                </td>
                <td className="px-3 py-2 font-medium">
                  {/* A taça vai DEPOIS do nome: o olho lê o clube e só então o
                      troféu qualifica quem leu. À esquerda ela empurrava os
                      nomes e desalinhava a coluna inteira por causa de uma
                      linha. */}
                  <span className="flex items-center gap-2">
                    <ClubName club={linha.clube} />
                    {linha.zona === "TITULO" ? (
                      <Trophy className="size-3.5 shrink-0 text-[color:var(--ok)]" />
                    ) : null}
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

/** Quem venceu o confronto. Empate no mata-mata resolve pelo mando (casa). */
function vencedorCasa(confronto: MockConfronto): boolean {
  return (confronto.golsCasa ?? 0) >= (confronto.golsFora ?? 0);
}

function Confronto({
  confronto,
  lado,
}: {
  confronto: MockConfronto;
  /** De que lado da chave ele está — decide para onde a perna do conector sai. */
  lado: "esquerda" | "direita";
}) {
  const casaVence = confronto.decidido && vencedorCasa(confronto);
  return (
    <div className="relative flex items-center">
      {/* A perna horizontal que sai do confronto rumo ao centro. É ela que faz a
          chave "andar" para a final em vez de ser três colunas soltas. */}
      {lado === "direita" ? (
        <span
          aria-hidden
          className="h-px w-3 shrink-0 bg-border"
        />
      ) : null}
      <div
        className={`flex-1 overflow-hidden rounded-sm border text-xs transition-colors ${
          confronto.decidido
            ? "border-border bg-surface-2"
            : "border-dashed border-border/70 bg-transparent"
        }`}
      >
        <Side
          clube={confronto.casa}
          gols={confronto.golsCasa}
          vencedor={confronto.decidido && casaVence}
        />
        <div className="border-t border-border/60" />
        <Side
          clube={confronto.fora}
          gols={confronto.golsFora}
          vencedor={confronto.decidido && !casaVence}
        />
      </div>
      {lado === "esquerda" ? (
        <span aria-hidden className="h-px w-3 shrink-0 bg-border" />
      ) : null}
    </div>
  );
}

/**
 * Uma coluna de uma fase.
 *
 * `justify-around` é o que dá o formato de chave sem uma linha de matemática:
 * cada coluna ocupa a mesma altura, e uma fase com metade dos confrontos
 * distribui-se sozinha CENTRADA entre os dois que a alimentam. Posicionar à mão
 * exigiria calcular offsets por rodada e quebraria com qualquer número de
 * clubes.
 */
function ColunaFase({
  fase,
  lado,
}: {
  fase: MockFaseMataMata;
  lado: "esquerda" | "direita";
}) {
  return (
    <div className="flex min-w-[170px] flex-1 flex-col">
      <div
        className={`font-heading mb-2 text-[10px] uppercase tracking-wide text-muted-foreground ${
          lado === "direita" ? "text-right" : ""
        }`}
      >
        {fase.nome}
      </div>
      <div className="flex flex-1 flex-col justify-around gap-2">
        {fase.confrontos.map((confronto) => (
          <Confronto key={confronto.id} confronto={confronto} lado={lado} />
        ))}
      </div>
    </div>
  );
}

/**
 * A chave, espelhada: metade de cada fase de um lado, metade do outro, e a final
 * no meio.
 *
 * É o desenho clássico de mata-mata, e ele carrega informação que três colunas
 * lado a lado não carregam: dá para ver de qual METADE cada finalista veio, e
 * portanto quem nunca poderia ter se cruzado antes da final. Num chaveamento
 * semeado por reputação (`06-temporada-e-competicoes.md:216`), essa é a leitura
 * que o operador faz.
 */
function Bracket({
  torneioId,
  clubes,
  emAndamento,
}: {
  torneioId: string;
  clubes: ClubeRef[];
  emAndamento: boolean;
}) {
  const fases = mockChave(torneioId, clubes, emAndamento);
  if (fases.length < 2) {
    return (
      <p className="text-sm text-muted-foreground">
        Clubes insuficientes para montar a chave.
      </p>
    );
  }

  const final = fases[fases.length - 1]!;
  const anteriores = fases.slice(0, -1);
  const metade = (n: number) => Math.ceil(n / 2);

  // A primeira metade dos confrontos de cada fase vai à esquerda; a segunda, à
  // direita. As duas se encontram na final — que é exatamente o que a final é.
  const esquerda = anteriores.map((fase) => ({
    nome: fase.nome,
    confrontos: fase.confrontos.slice(0, metade(fase.confrontos.length)),
  }));
  // Invertida: a semifinal fica COLADA no centro, e as oitavas na borda.
  const direita = anteriores
    .map((fase) => ({
      nome: fase.nome,
      confrontos: fase.confrontos.slice(metade(fase.confrontos.length)),
    }))
    .reverse();

  const decisao = final.confrontos[0];
  const campeao =
    decisao === undefined || !decisao.decidido
      ? null
      : vencedorCasa(decisao)
        ? decisao.casa
        : decisao.fora;

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-h-[26rem] min-w-[56rem] items-stretch gap-2">
        {esquerda.map((fase) => (
          <ColunaFase key={`e:${fase.nome}`} fase={fase} lado="esquerda" />
        ))}

        {/* A final: no meio, maior, e é o único lugar da chave com troféu. */}
        <div className="flex min-w-[200px] flex-col justify-center px-2">
          <div className="font-heading mb-2 text-center text-[10px] uppercase tracking-wide text-primary">
            Final
          </div>
          {decisao === undefined ? null : (
            <div
              className={`overflow-hidden rounded-sm border-2 text-sm ${
                decisao.decidido
                  ? "border-primary bg-primary/5"
                  : "border-dashed border-border"
              }`}
            >
              <Side
                clube={decisao.casa}
                gols={decisao.golsCasa}
                vencedor={decisao.decidido && vencedorCasa(decisao)}
              />
              <div className="border-t border-border/60" />
              <Side
                clube={decisao.fora}
                gols={decisao.golsFora}
                vencedor={decisao.decidido && !vencedorCasa(decisao)}
              />
            </div>
          )}
          {/* Campeão só aparece quando a final foi decidida. Um troféu numa
              final em aberto coroaria quem ainda não ganhou. */}
          {campeao === null ? (
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              final em aberto
            </p>
          ) : (
            <div className="mt-3 flex flex-col items-center gap-1">
              <Trophy className="size-5 text-[color:var(--ok)]" />
              <span className="font-heading flex items-center gap-2 text-sm text-[color:var(--ok)]">
                <ClubCrest club={campeao} size="lg" />
                {campeao.name}
              </span>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                campeão
              </span>
            </div>
          )}
        </div>

        {direita.map((fase) => (
          <ColunaFase key={`d:${fase.nome}`} fase={fase} lado="direita" />
        ))}
      </div>
    </div>
  );
}

function Side({
  clube,
  gols,
  vencedor,
}: {
  clube: ClubeRef;
  gols: number | null;
  vencedor: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-2 px-2.5 py-1.5 ${
        vencedor
          ? "bg-surface-2 font-semibold text-foreground"
          : "text-muted-foreground"
      }`}
    >
      <ClubName club={clube} />
      {/* Confronto não decidido mostra "–", não 0: zero é um placar de verdade e
          diria que o jogo terminou empatado. */}
      <span className="mono shrink-0 tabular-nums">{gols ?? "–"}</span>
    </div>
  );
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
  // O clube inteiro, com identidade visual: é o que faz o escudo aparecer em
  // toda tabela sem cada uma reencontrar o clube para achá-lo.
  const refs: ClubeRef[] = clubs.map((c) => ({
    id: c.id,
    name: c.name,
    shortCode: c.shortCode,
    primaryColor: c.primaryColor,
    secondaryColor: c.secondaryColor,
    crestTemplateId: c.crestTemplateId,
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

      {/* `key` no torneio: o `Tabs` guarda a aba em `useState(defaultValue)`, e
          `useState` só olha o valor inicial. Sem remontar, trocar de torneio
          deixava a aba apontando para uma que o novo torneio NÃO tem — a Liga
          abre em "tabela", você clica na Copa, que não tem tabela, e a área fica
          VAZIA. O `key` faz o React remontar e o default valer de novo. */}
      <Tabs
        key={torneio.id}
        defaultValue={temTabela ? "tabela" : temGrupos ? "grupos" : "chave"}
      >
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
            <Bracket
              torneioId={torneio.id}
              clubes={refs}
              emAndamento={torneio.emAndamento}
            />
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
          {/* Duas coisas diferentes, e o canon as separa: dinheiro do CLUBE
              entra por `ClubSeasonUpdate.budgetChange` (§9) quando a temporada
              vira; os prêmios do §7 são INDIVIDUAIS e afetam reputação e
              mercado. Misturá-los numa tabela só diria que "artilheiro" paga
              cota. */}
          <div className="mb-6 space-y-2">
            <div className="flex flex-wrap items-baseline gap-3">
              <h3 className="font-heading text-sm">Premiação do clube</h3>
              <span className="mono text-[11px] text-muted-foreground">
                financialWeight {FINANCIAL_WEIGHT[torneio.tipo].toFixed(2)} ·
                R-59
              </span>
            </div>
            <div className="overflow-x-auto rounded-sm border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Colocação</th>
                    <th className="px-3 py-2 font-medium">Clube</th>
                    <th className="px-3 py-2 text-right font-medium">Cota</th>
                  </tr>
                </thead>
                <tbody>
                  {mockPremiacaoDinheiro(torneio, refs).map((premio) => (
                    <tr
                      key={premio.colocacao}
                      className="border-b border-border/60 even:bg-surface-2/40 last:border-0"
                    >
                      <td className="px-3 py-2 font-medium">
                        <span className="flex items-center gap-2">
                          {premio.colocacao}
                          {premio.colocacao === "Campeão" ? (
                            <Trophy className="size-3.5 shrink-0 text-[color:var(--ok)]" />
                          ) : null}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {/* Sem clube definido: a cota existe, o dono ainda não. */}
                        {premio.clube === null ? (
                          <span className="text-xs">a definir</span>
                        ) : (
                          <ClubName club={premio.clube} />
                        )}
                      </td>
                      <td className="mono px-3 py-2 text-right tabular-nums">
                        {(Number(premio.valorMinor) / 100).toLocaleString(
                          "pt-BR",
                          {
                            style: "currency",
                            currency: "BRL",
                            maximumFractionDigits: 0,
                          },
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Os pesos são os da R-59: liga nacional 1,00 · continental 0,85 ·
              copa 0,70 · estadual 0,35. A liga domina a receita recorrente,
              enquanto continental/mundial dominam o prestígio — por isso a liga
              paga mais que a continental, mesmo valendo menos reputação.
            </p>
          </div>

          <div className="mb-2 flex flex-wrap items-baseline gap-3">
            <h3 className="font-heading text-sm">Prêmios individuais</h3>
            <span className="mono text-[11px] text-muted-foreground">
              reputationWeight {REPUTATION_WEIGHT[torneio.tipo].toFixed(2)} ·
              R-59
            </span>
          </div>
          <div className="overflow-x-auto rounded-sm border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Categoria</th>
                  <th className="px-3 py-2 font-medium">Eleito</th>
                  <th className="px-3 py-2 font-medium">Clube</th>
                  <th className="px-3 py-2 text-right font-medium">
                    Valorização
                  </th>
                  <th className="px-3 py-2 text-right font-medium">Overall</th>
                  <th className="px-3 py-2 text-right font-medium">Moral</th>
                </tr>
              </thead>
              <tbody>
                {mockPremiacao(torneio, refs).map((premio) => (
                  <tr
                    key={premio.categoria}
                    className="border-b border-border/60 even:bg-surface-2/40 last:border-0"
                  >
                    <td className="px-3 py-2 font-medium">{premio.categoria}</td>
                    <td className="px-3 py-2">{premio.jogador}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {premio.clube === null ? (
                        "—"
                      ) : (
                        <ClubName club={premio.clube} />
                      )}
                    </td>
                    <Delta valor={premio.valorizacao} sufixo="%" />
                    <Delta valor={premio.overall} sufixo="" />
                    <Delta valor={premio.moral} sufixo="%" />
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
  linhas: readonly MockJogadorRanking[];
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
              className="border-b border-border/60 even:bg-surface-2/40 last:border-0"
            >
              <td className="mono px-3 py-2 tabular-nums text-muted-foreground">
                {linha.colocacao}
              </td>
              <td className="px-3 py-2 font-medium">
                {/* Número e posição ENCOSTADOS no nome: é assim que se lê uma
                    escalação. Em colunas separadas, o olho teria de percorrer a
                    linha inteira para montar "camisa 9, atacante". */}
                <span className="flex items-center gap-2">
                  <span className="mono w-6 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                    {linha.numero}
                  </span>
                  <PositionBadge posicao={linha.posicao} />
                  {linha.jogador}
                </span>
              </td>
              <td className="px-3 py-2 text-muted-foreground">
                {linha.clube === null ? "—" : <ClubName club={linha.clube} />}
              </td>
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

/**
 * Um efeito do prêmio. Verde sobe, vermelho desce, cinza não move.
 *
 * O zero é cinza e sem sinal de propósito: "Melhor técnico" não move nada de
 * jogador — ele não é jogador —, e um `+0` verde diria que moveu.
 */
function Delta({ valor, sufixo }: { valor: number; sufixo: string }) {
  const cor =
    valor > 0
      ? "text-[color:var(--ok)]"
      : valor < 0
        ? "text-[color:var(--danger)]"
        : "text-muted-foreground";
  return (
    <td className={`mono px-3 py-2 text-right tabular-nums ${cor}`}>
      {valor === 0 ? "—" : `${valor > 0 ? "+" : ""}${valor}${sufixo}`}
    </td>
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
