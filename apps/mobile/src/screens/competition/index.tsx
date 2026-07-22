import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";

import { Card, SectionHeader } from "@/components/card";
import { Icon } from "@/components/icon";
import { Refresh } from "@/components/refresh";
import { ScreenStatePanel } from "@/components/screen-state-panel";
import {
  selectManagedClub,
  type ClubPortfolioProjection,
} from "@/lib/club-projection";
import { deriveScreenState } from "@/lib/screen-state";
import { useSession } from "@/lib/session";
import { useWorldQuery } from "@/lib/world";
import { ClubCrest } from "@/screens/club/customization/crest";
import { clubCrestData } from "@/screens/club/customization/visual-identity";
import {
  availableTabs,
  formatLabel,
  groupMatchesByRound,
  lifecycleLabel,
  statAvailability,
  tableZone,
  type ClubBadgeSource,
  type CompetitionDetailSource,
  type CompetitionMatchSource,
  type CompetitionTabId,
  type MatchStatsCoverageSource,
  type StatKind,
} from "@/screens/competition/competition-model";
import {
  deriveOnboardingStep,
  type MobileIdentityProjection,
} from "@/screens/onboarding/onboarding-model";
import { color, fontSize, fontWeight, radius, space } from "@/theme";

interface StandingRowSource {
  readonly clubId: string;
  readonly clubName: string;
  readonly shortCode: string;
  readonly primaryColor: string | null;
  readonly secondaryColor: string | null;
  readonly crestTemplateId: string | null;
  readonly played: number;
  readonly won: number;
  readonly drawn: number;
  readonly lost: number;
  readonly goalsFor: number;
  readonly goalsAgainst: number;
  readonly goalDifference: number;
  readonly points: number;
}

interface TableProjection {
  readonly groups: readonly {
    readonly group: string | null;
    readonly table: readonly StandingRowSource[];
  }[];
}

interface BracketProjection {
  readonly rounds: readonly {
    readonly round: number;
    readonly name: string;
    readonly ties: readonly {
      readonly tieKey: string;
      readonly home: ClubBadgeSource;
      readonly away: ClubBadgeSource;
      readonly homeAggregate: number;
      readonly awayAggregate: number;
      readonly winnerClubId: string | null;
      readonly undecidedReason: string | null;
      readonly legs: readonly {
        readonly matchId: string;
        readonly homeGoals: number | null;
        readonly awayGoals: number | null;
        readonly finished: boolean;
        readonly scheduledOn: string;
      }[];
    }[];
  }[];
}

interface MatchesProjection {
  readonly matches: readonly CompetitionMatchSource[];
}

interface PlayerStatSource {
  readonly playerId: string;
  readonly name: string;
  readonly club: ClubBadgeSource;
  readonly value: number;
}

interface StatsProjection {
  readonly coverage: MatchStatsCoverageSource;
  readonly scorers: readonly PlayerStatSource[];
  readonly assists: readonly PlayerStatSource[];
}

interface OutcomeProjection {
  readonly finished: boolean;
  readonly champion: { readonly clubId: string; readonly clubName: string } | null;
  readonly promotionSlots: number;
  readonly relegationSlots: number;
  readonly rows: readonly (StandingRowSource & {
    readonly rank: number;
    readonly outcome: string;
  })[];
}

/**
 * `M-COMPETITION` (doc `04-ui-ux/10`) — tudo de uma competição, em abas.
 *
 * Cada aba consulta a SUA query (o doc pede *loading* por aba): abrir a tela não
 * baixa o campeonato inteiro. `competitionId` vem da rota.
 */
export function Competition() {
  const params = useLocalSearchParams<{ competitionId?: string }>();
  const competitionId = params.competitionId ?? null;
  const { session, status } = useSession();
  const [tab, setTab] = useState<CompetitionTabId | null>(null);

  const clubQuery = useWorldQuery<ClubPortfolioProjection>("club-detail");
  const identityQuery =
    useWorldQuery<MobileIdentityProjection>("identity-detail");
  const onboarding =
    session === null
      ? null
      : deriveOnboardingStep(
          identityQuery.state === "ready" ? identityQuery.data : null,
          session.accountId,
          clubQuery.asOf ?? "",
        );
  const managedClub = selectManagedClub(
    clubQuery.data,
    onboarding?.kind === "complete" ? onboarding.clubId : null,
  );

  const scope = competitionId === null ? undefined : { competitionId };
  const detailQuery = useWorldQuery<CompetitionDetailSource>(
    competitionId === null ? null : "competition-detail",
    scope,
  );
  const detail = detailQuery.data;

  const tabs = useMemo(
    () => (detail ? availableTabs(detail) : []),
    [detail],
  );
  const activeTab = tab ?? tabs[0]?.id ?? null;

  const refresh = useCallback(() => {
    detailQuery.refetch();
  }, [detailQuery.refetch]);

  const screenState = deriveScreenState({
    session: status,
    query:
      detailQuery.state === "loading"
        ? "loading"
        : detailQuery.state === "offline"
          ? "offline"
          : detailQuery.state === "error"
            ? "error"
            : "ready",
    hasCachedData: detailQuery.isStale,
  });

  if (screenState !== "success" || detail == null || competitionId === null) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.content}>
          <ScreenStatePanel
            state={screenState === "success" ? "empty" : screenState}
            onRetry={refresh}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<Refresh onRefresh={refresh} />}
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            hitSlop={8}
            style={styles.back}
          >
            <Icon name="arrow-back" size={22} color={color.text} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.title} numberOfLines={1}>
              {detail.name.toUpperCase()}
            </Text>
            <Text style={styles.subtitle}>
              Temporada {detail.seasonNumber} · {formatLabel(detail.format)} ·{" "}
              {lifecycleLabel(detail.lifecycle)}
            </Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}
        >
          {tabs.map((t) => (
            <Pressable
              key={t.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === t.id }}
              accessibilityLabel={t.label}
              onPress={() => setTab(t.id)}
              style={[styles.tab, activeTab === t.id && styles.tabActive]}
            >
              <Text
                style={[
                  styles.tabLabel,
                  activeTab === t.id && styles.tabLabelActive,
                ]}
              >
                {t.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {activeTab === "table" || activeTab === "groups" ? (
          <TableTab
            competitionId={competitionId}
            detail={detail}
            myClubId={managedClub?.id ?? null}
          />
        ) : null}
        {activeTab === "bracket" ? (
          <BracketTab competitionId={competitionId} />
        ) : null}
        {activeTab === "matches" ? (
          <MatchesTab
            competitionId={competitionId}
            myClubId={managedClub?.id ?? null}
          />
        ) : null}
        {activeTab === "scorers" ? (
          <StatsTab competitionId={competitionId} kind="scorers" />
        ) : null}
        {activeTab === "assists" ? (
          <StatsTab competitionId={competitionId} kind="assists" />
        ) : null}
        {activeTab === "awards" ? (
          <AwardsTab competitionId={competitionId} />
        ) : null}
        {activeTab === "rules" ? <RulesTab detail={detail} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Painel de estado de UMA aba — o doc pede *loading* por aba, não da tela. */
function TabState({
  state,
  onRetry,
}: {
  state: "loading" | "ready" | "empty" | "error" | "offline";
  onRetry: () => void;
}) {
  if (state === "ready") return null;
  return (
    <Card>
      <ScreenStatePanel
        state={
          state === "loading"
            ? "initial-loading"
            : state === "offline"
              ? "offline"
              : state === "error"
                ? "technical-error"
                : "empty"
        }
        onRetry={onRetry}
      />
    </Card>
  );
}

/**
 * O escudo de um clube em qualquer lista desta tela (tabela, jogos, chaveamento,
 * artilharia, premiação).
 *
 * Os `null` vão CRUS para `clubCrestData` — ela tem o fallback certo: identidade
 * determinística pelo nome (`defaultVisualIdentity`), colorida e distinta por
 * clube, a mesma que o admin e a Home usam. Substituir o `null` por cinza do
 * tema aqui, como esta função fazia, matava esse fallback e pintava TODOS os
 * clubes com o mesmo escudo cinza — que é o que se vê num mundo cujos clubes
 * ainda não foram personalizados (identidade sem cor gravada).
 */
function Badge({ club, size = 22 }: { club: ClubBadgeSource; size?: number }) {
  return (
    <ClubCrest
      {...clubCrestData(
        club.clubName,
        club.primaryColor,
        club.secondaryColor,
        club.crestTemplateId,
      )}
      size={size}
    />
  );
}

function TableTab({
  competitionId,
  detail,
  myClubId,
}: {
  competitionId: string;
  detail: CompetitionDetailSource;
  myClubId: string | null;
}) {
  const query = useWorldQuery<TableProjection>("competition-table", {
    competitionId,
  });
  if (query.state !== "ready" || query.data == null) {
    return <TabState state={query.state} onRetry={query.refetch} />;
  }
  const groups = query.data.groups;
  if (groups.length === 0) {
    return (
      <Card>
        <Text style={styles.empty}>
          Esta competição ainda não tem clubes classificados numa tabela.
        </Text>
      </Card>
    );
  }

  return (
    <>
      {groups.map((group) => (
        <Card key={group.group ?? "unica"}>
          <SectionHeader
            title={group.group === null ? "CLASSIFICAÇÃO" : `GRUPO ${group.group}`}
          />
          {/* P · J · V · E · D · SG — a leitura de tabela que o torcedor
              espera: pontos, jogos, e como eles vieram. */}
          <View style={styles.tableHead}>
            <View style={styles.zone} />
            <Text style={[styles.cellRank, styles.headText]}>#</Text>
            <Text style={[styles.cellClub, styles.headText]}>CLUBE</Text>
            <Text style={[styles.cellNum, styles.headText]}>P</Text>
            <Text style={[styles.cellNum, styles.headText]}>J</Text>
            <Text style={[styles.cellNum, styles.headText]}>V</Text>
            <Text style={[styles.cellNum, styles.headText]}>E</Text>
            <Text style={[styles.cellNum, styles.headText]}>D</Text>
            <Text style={[styles.cellNum, styles.headText]}>SG</Text>
          </View>
          {group.table.map((row, index) => {
            const zone = tableZone(index + 1, group.table.length, detail);
            return (
              <Pressable
                key={row.clubId}
                accessibilityRole="button"
                accessibilityLabel={`Ver ${row.clubName}`}
                onPress={() => router.push(`/clubes/${row.clubId}`)}
                style={styles.tableRow}
              >
                <View
                  style={[
                    styles.zone,
                    zone === "promotion" && styles.zonePromotion,
                    zone === "relegation" && styles.zoneRelegation,
                  ]}
                />
                <Text style={styles.cellRank}>{index + 1}</Text>
                <View style={styles.cellClubBox}>
                  <Badge club={row} size={26} />
                  <Text
                    style={[
                      styles.cellClubText,
                      row.clubId === myClubId && styles.mine,
                    ]}
                    numberOfLines={1}
                  >
                    {row.clubName}
                  </Text>
                </View>
                <Text style={[styles.cellNum, styles.points]}>{row.points}</Text>
                <Text style={styles.cellNum}>{row.played}</Text>
                <Text style={[styles.cellNum, styles.won]}>{row.won}</Text>
                <Text style={styles.cellNum}>{row.drawn}</Text>
                <Text style={[styles.cellNum, styles.lost]}>{row.lost}</Text>
                <Text style={styles.cellNum}>
                  {row.goalDifference > 0 ? "+" : ""}
                  {row.goalDifference}
                </Text>
              </Pressable>
            );
          })}
          {detail.promotionSlots > 0 || detail.relegationSlots > 0 ? (
            <Text style={styles.legend}>
              {detail.promotionSlots > 0
                ? `${detail.promotionSlots} sobem`
                : ""}
              {detail.promotionSlots > 0 && detail.relegationSlots > 0 ? " · " : ""}
              {detail.relegationSlots > 0
                ? `${detail.relegationSlots} caem`
                : ""}
            </Text>
          ) : null}
        </Card>
      ))}
    </>
  );
}

function BracketTab({ competitionId }: { competitionId: string }) {
  const query = useWorldQuery<BracketProjection>("competition-bracket", {
    competitionId,
  });
  if (query.state !== "ready" || query.data == null) {
    return <TabState state={query.state} onRetry={query.refetch} />;
  }
  const rounds = query.data.rounds;
  if (rounds.length === 0) {
    return (
      <Card>
        <Text style={styles.empty}>
          O mata-mata ainda não foi sorteado — ele nasce quando a fase anterior
          terminar.
        </Text>
      </Card>
    );
  }

  return (
    <>
      {rounds.map((round) => (
        <Card key={round.round}>
          <SectionHeader title={round.name.toUpperCase()} />
          {round.ties.map((tie) => (
            <View key={tie.tieKey} style={styles.tie}>
              <View style={styles.tieSide}>
                <Badge club={tie.home} size={20} />
                <Text
                  style={[
                    styles.tieClub,
                    tie.winnerClubId === tie.home.clubId && styles.mine,
                  ]}
                  numberOfLines={1}
                >
                  {tie.home.clubName}
                </Text>
              </View>
              <Text style={styles.tieScore}>
                {tie.homeAggregate}–{tie.awayAggregate}
              </Text>
              <View style={styles.tieSide}>
                <Text
                  style={[
                    styles.tieClub,
                    tie.winnerClubId === tie.away.clubId && styles.mine,
                  ]}
                  numberOfLines={1}
                >
                  {tie.away.clubName}
                </Text>
                <Badge club={tie.away} size={20} />
              </View>
            </View>
          ))}
          {round.ties.some((t) => t.undecidedReason === "AGGREGATE_TIE") ? (
            <Text style={styles.warn}>
              Confronto empatado no agregado. O critério de desempate (gol fora,
              prorrogação, pênaltis) ainda não existe nas regras do mundo.
            </Text>
          ) : null}
        </Card>
      ))}
    </>
  );
}

function MatchesTab({
  competitionId,
  myClubId,
}: {
  competitionId: string;
  myClubId: string | null;
}) {
  const query = useWorldQuery<MatchesProjection>("competition-matches", {
    competitionId,
  });
  const rounds = useMemo(
    () => groupMatchesByRound(query.data?.matches ?? []),
    [query.data],
  );
  if (query.state !== "ready" || query.data == null) {
    return <TabState state={query.state} onRetry={query.refetch} />;
  }
  if (rounds.length === 0) {
    return (
      <Card>
        <Text style={styles.empty}>
          O calendário desta competição ainda não foi gerado.
        </Text>
      </Card>
    );
  }

  return (
    <>
      {rounds.map((round) => (
        <Card key={round.roundNumber ?? "sem-rodada"}>
          <SectionHeader
            title={
              round.roundNumber === null
                ? "SEM RODADA"
                : `RODADA ${round.roundNumber}`
            }
            trailing={
              <Text style={styles.roundTag}>
                {round.played ? "encerrada" : "a jogar"}
              </Text>
            }
          />
          {/* A LINHA leva ao relatório do jogo; os NOMES levam ao clube. Só
              partida jogada tem relatório — a futura não tem o que contar, e
              abrir uma tela vazia seria pior que não abrir. */}
          {round.matches.map((m) => (
            <Pressable
              key={m.matchId}
              accessibilityRole="button"
              accessibilityLabel={
                m.finished
                  ? `Ver o que aconteceu em ${m.home.clubName} contra ${m.away.clubName}`
                  : `${m.home.clubName} contra ${m.away.clubName}, ainda não jogada`
              }
              disabled={!m.finished}
              onPress={() => router.push(`/partida/${m.matchId}`)}
              style={styles.matchRow}
            >
              <View style={styles.matchSideLeft}>
                <Text
                  style={[
                    styles.matchClub,
                    m.home.clubId === myClubId && styles.mine,
                  ]}
                  numberOfLines={1}
                >
                  {m.home.clubName}
                </Text>
                <Badge club={m.home} size={20} />
              </View>
              <Text style={m.finished ? styles.score : styles.kickoff}>
                {m.finished ? `${m.homeGoals}–${m.awayGoals}` : m.scheduledOn.slice(5)}
              </Text>
              <View style={styles.matchSideRight}>
                <Badge club={m.away} size={20} />
                <Text
                  style={[
                    styles.matchClub,
                    m.away.clubId === myClubId && styles.mine,
                  ]}
                  numberOfLines={1}
                >
                  {m.away.clubName}
                </Text>
              </View>
              {m.finished ? (
                <Icon name="chevron-forward" size={14} color={color.textFaint} />
              ) : (
                <View style={styles.chevronSpacer} />
              )}
            </Pressable>
          ))}
        </Card>
      ))}
    </>
  );
}

function StatsTab({
  competitionId,
  kind,
}: {
  competitionId: string;
  kind: StatKind;
}) {
  const query = useWorldQuery<StatsProjection>("competition-stats", {
    competitionId,
  });
  if (query.state !== "ready" || query.data == null) {
    return <TabState state={query.state} onRetry={query.refetch} />;
  }

  const availability = statAvailability(query.data.coverage, kind);
  if (availability.kind === "engine-missing") {
    // Estado explícito de INDISPONÍVEL — não uma lista de zeros, que se leria
    // como "ninguém marcou/assistiu".
    return (
      <Card>
        <SectionHeader
          title={kind === "scorers" ? "ARTILHARIA" : "ASSISTÊNCIAS"}
        />
        <Text style={styles.unavailableTitle}>Indisponível nesta versão</Text>
        <Text style={styles.empty}>{availability.reason}</Text>
      </Card>
    );
  }

  const rows = kind === "scorers" ? query.data.scorers : query.data.assists;
  return (
    <Card>
      <SectionHeader
        title={kind === "scorers" ? "ARTILHARIA" : "ASSISTÊNCIAS"}
      />
      {rows.length === 0 ? (
        <Text style={styles.empty}>
          {kind === "scorers"
            ? "Nenhum gol marcado nesta competição ainda."
            : "Nenhuma assistência registrada nesta competição ainda."}
        </Text>
      ) : (
        rows.map((row, index) => (
          <Pressable
            key={row.playerId}
            accessibilityRole="button"
            accessibilityLabel={`Ver ${row.club.clubName}`}
            onPress={() =>
              row.club.clubId === ""
                ? undefined
                : router.push(`/clubes/${row.club.clubId}`)
            }
            style={styles.statRow}
          >
            <Text style={styles.cellRank}>{index + 1}</Text>
            <Badge club={row.club} size={22} />
            <View style={styles.statText}>
              <Text style={styles.statName} numberOfLines={1}>
                {row.name}
              </Text>
              <Text style={styles.statClub} numberOfLines={1}>
                {row.club.clubName}
              </Text>
            </View>
            <Text style={styles.points}>{row.value}</Text>
          </Pressable>
        ))
      )}
    </Card>
  );
}

function AwardsTab({ competitionId }: { competitionId: string }) {
  const query = useWorldQuery<OutcomeProjection>("competition-outcome", {
    competitionId,
  });
  const stats = useWorldQuery<StatsProjection>("competition-stats", {
    competitionId,
  });
  if (query.state !== "ready" || query.data == null) {
    return <TabState state={query.state} onRetry={query.refetch} />;
  }
  const outcome = query.data;
  const topScorer = stats.data?.scorers[0] ?? null;
  // O escudo do campeão vem da linha dele na tabela final — `champion` só traz
  // id e nome, e a linha já carrega cor e modelo de escudo.
  const championRow =
    outcome.champion === null
      ? null
      : (outcome.rows.find((r) => r.clubId === outcome.champion?.clubId) ?? null);
  const champion: ClubBadgeSource | null =
    championRow === null
      ? null
      : {
          clubId: championRow.clubId,
          clubName: championRow.clubName,
          shortCode: championRow.shortCode,
          primaryColor: championRow.primaryColor,
          secondaryColor: championRow.secondaryColor,
          crestTemplateId: championRow.crestTemplateId,
        };

  return (
    <Card>
      <SectionHeader title="PREMIAÇÃO" />
      {!outcome.finished ? (
        <Text style={styles.warn}>
          Edição em disputa: os prêmios abaixo são PRÉVIA, não resultado
          homologado.
        </Text>
      ) : null}

      <View style={styles.award}>
        <Text style={styles.awardLabel}>Campeão</Text>
        <View style={styles.awardRight}>
          {champion !== null ? <Badge club={champion} size={22} /> : null}
          <Text style={styles.awardValue}>
            {outcome.champion?.clubName ?? "a definir"}
          </Text>
        </View>
      </View>
      <View style={styles.award}>
        <Text style={styles.awardLabel}>Artilheiro</Text>
        <View style={styles.awardRight}>
          {topScorer ? <Badge club={topScorer.club} size={22} /> : null}
          <Text style={styles.awardValue}>
            {topScorer ? `${topScorer.name} (${topScorer.value})` : "a definir"}
          </Text>
        </View>
      </View>

      {outcome.promotionSlots > 0 ? (
        <View style={styles.award}>
          <Text style={styles.awardLabel}>Acesso</Text>
          <Text style={styles.awardValue}>
            {outcome.rows
              .filter((r) => r.outcome === "PROMOTED")
              .map((r) => r.clubName)
              .join(", ") || "a definir"}
          </Text>
        </View>
      ) : null}
      {outcome.relegationSlots > 0 ? (
        <View style={styles.award}>
          <Text style={styles.awardLabel}>Rebaixamento</Text>
          <Text style={styles.awardValue}>
            {outcome.rows
              .filter((r) => r.outcome === "RELEGATED")
              .map((r) => r.clubName)
              .join(", ") || "a definir"}
          </Text>
        </View>
      ) : null}

      <Text style={styles.legend}>
        Prêmios individuais subjetivos (craque, revelação, seleção da temporada)
        ainda não são apurados pelo mundo.
      </Text>
    </Card>
  );
}

function RulesTab({ detail }: { detail: CompetitionDetailSource }) {
  return (
    <Card>
      <SectionHeader title="REGULAMENTO" />
      <Line label="Formato" value={formatLabel(detail.format)} />
      <Line label="Clubes" value={String(detail.clubCount)} />
      <Line
        label="Rodadas"
        value={
          detail.totalRounds === null
            ? "a definir"
            : `${detail.currentRound ?? 0} de ${detail.totalRounds}`
        }
      />
      <Line
        label="Jogos"
        value={`${detail.playedMatches} de ${detail.totalMatches}`}
      />
      <Line
        label="Janela"
        value={
          detail.startsOn && detail.endsOn
            ? `${detail.startsOn} → ${detail.endsOn}`
            : "a definir"
        }
      />
      <Line
        label="Acesso"
        value={
          detail.promotionSlots > 0
            ? `${detail.promotionSlots} vagas`
            : "não há divisão acima"
        }
      />
      <Line
        label="Rebaixamento"
        value={
          detail.relegationSlots > 0
            ? `${detail.relegationSlots} vagas`
            : "não há divisão abaixo"
        }
      />
      <Text style={styles.legend}>
        Limites de inscrição, estrangeiros e idade vivem na tela de inscrição do
        elenco e ainda não são expostos por esta competição.
      </Text>
    </Card>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.line}>
      <Text style={styles.lineLabel}>{label}</Text>
      <Text style={styles.lineValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.background },
  content: { padding: space.lg, gap: space.md },
  header: { flexDirection: "row", alignItems: "center", gap: space.sm },
  back: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1, gap: space.xs },
  title: {
    color: color.text,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold as "700",
  },
  subtitle: { color: color.textMuted, fontSize: fontSize.xs },
  tabs: { gap: space.sm, paddingVertical: space.xs },
  tab: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
  },
  tabActive: { backgroundColor: color.primary, borderColor: color.primary },
  tabLabel: { color: color.textMuted, fontSize: fontSize.xs },
  tabLabelActive: {
    color: color.primaryContrast,
    fontWeight: fontWeight.bold as "700",
  },

  tableHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingBottom: space.xs,
  },
  headText: { color: color.textFaint, fontSize: fontSize.xs },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingVertical: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.border,
  },
  zone: { width: 3, height: 20, borderRadius: 2, backgroundColor: "transparent" },
  zonePromotion: { backgroundColor: color.success },
  zoneRelegation: { backgroundColor: color.danger },
  cellRank: { width: 20, color: color.textMuted, fontSize: fontSize.xs },
  cellClub: { flex: 1 },
  cellClubBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  cellClubText: { flex: 1, color: color.text, fontSize: fontSize.sm },
  cellNum: {
    width: 22,
    textAlign: "center",
    color: color.textMuted,
    fontSize: fontSize.xs,
  },
  won: { color: color.success },
  lost: { color: color.danger },
  points: {
    width: 22,
    textAlign: "center",
    color: color.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as "700",
  },
  mine: { color: color.primary, fontWeight: fontWeight.bold as "700" },
  legend: {
    color: color.textFaint,
    fontSize: fontSize.xs,
    marginTop: space.sm,
  },
  warn: { color: color.warning, fontSize: fontSize.xs, marginBottom: space.sm },

  tie: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingVertical: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.border,
  },
  tieSide: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  tieClub: { flex: 1, color: color.text, fontSize: fontSize.sm },
  tieScore: {
    minWidth: 48,
    textAlign: "center",
    color: color.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as "700",
  },

  matchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingVertical: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.border,
  },
  matchSideLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: space.sm,
  },
  matchSideRight: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  matchClub: { flex: 1, color: color.text, fontSize: fontSize.sm },
  score: {
    minWidth: 52,
    textAlign: "center",
    color: color.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as "700",
    backgroundColor: color.background,
    borderRadius: radius.sm,
    paddingVertical: 2,
  },
  kickoff: {
    minWidth: 52,
    textAlign: "center",
    color: color.textMuted,
    fontSize: fontSize.xs,
  },
  roundTag: { color: color.textFaint, fontSize: fontSize.xs },
  /** Reserva o espaço do chevron para a linha não "pular" entre jogada e não jogada. */
  chevronSpacer: { width: 14 },

  statRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingVertical: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.border,
  },
  statText: { flex: 1 },
  statName: { color: color.text, fontSize: fontSize.sm },
  statClub: { color: color.textMuted, fontSize: fontSize.xs },
  unavailableTitle: {
    color: color.warning,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as "700",
    marginBottom: space.xs,
  },

  award: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.sm,
    paddingVertical: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.border,
  },
  awardLabel: { color: color.textMuted, fontSize: fontSize.xs },
  awardRight: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: space.sm,
  },
  awardValue: {
    flex: 1,
    textAlign: "right",
    color: color.text,
    fontSize: fontSize.sm,
  },

  line: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.sm,
    paddingVertical: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.border,
  },
  lineLabel: { color: color.textMuted, fontSize: fontSize.xs },
  lineValue: { color: color.text, fontSize: fontSize.sm },

  empty: {
    color: color.textMuted,
    fontSize: fontSize.sm,
    paddingVertical: space.sm,
  },
});
