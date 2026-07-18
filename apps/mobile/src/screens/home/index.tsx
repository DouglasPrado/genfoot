import { useCallback, useEffect } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

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
import { useWorldQuery, type QueryState } from "@/lib/world";
import { ClubCrest } from "@/screens/club/customization/crest";
import { clubCrestData } from "@/screens/club/customization/visual-identity";
import {
  deriveOnboardingStep,
  type MobileIdentityProjection,
} from "@/screens/onboarding/onboarding-model";
import { color, fontSize, fontWeight, radius, space } from "@/theme";

/**
 * A tabela da liga como a query `competitions` a entrega (C7). Antes esta tela
 * esperava um resumo do mega-agregado (`editionCount`, `fixtureCount`) que a
 * R-175 matou; agora lê a classificação real, derivada dos jogos (R-178).
 */
interface CompetitionStandingsProjection {
  readonly competitionName: string;
  readonly totalMatches: number;
  readonly playedMatches: number;
  readonly table: readonly {
    readonly clubId: string;
    readonly clubName: string;
    readonly shortCode: string;
    readonly points: number;
    readonly played: number;
    readonly won: number;
    readonly drawn: number;
    readonly lost: number;
    readonly goalDifference: number;
  }[];
}

interface MatchSummaryProjection {
  readonly matchCount: number;
  readonly finalCount: number;
  readonly commandCount: number;
}

interface InboxSummaryProjection {
  readonly openNotificationCount: number;
  readonly timelineCount: number;
  readonly reportCount: number;
}

interface AutomationSummaryProjection {
  readonly activeRuleCount: number;
  readonly proposalCount: number;
  readonly executionCount: number;
}

function combinedQueryState(states: readonly QueryState[]): QueryState {
  if (states.includes("loading")) return "loading";
  if (states.includes("offline")) return "offline";
  if (states.includes("error")) return "error";
  if (states.includes("empty")) return "empty";
  return "ready";
}

/** Painel de comando do clube: somente projeções oficiais, sem seeds de demo. */
export function Home() {
  const { session, status } = useSession();
  const clubQuery = useWorldQuery<ClubPortfolioProjection>("club-detail");
  const identityQuery =
    useWorldQuery<MobileIdentityProjection>("identity-detail");
  const competitionQuery =
    useWorldQuery<CompetitionStandingsProjection>("competitions");
  const matchQuery = useWorldQuery<MatchSummaryProjection>("matches");
  const inboxQuery = useWorldQuery<InboxSummaryProjection>("inbox");
  const automationQuery =
    useWorldQuery<AutomationSummaryProjection>("automation");

  const identity = identityQuery.state === "ready" ? identityQuery.data : null;
  const onboarding =
    session === null
      ? null
      : deriveOnboardingStep(identity, session.accountId, clubQuery.asOf ?? "");
  const club = selectManagedClub(
    clubQuery.data,
    onboarding?.kind === "complete" ? onboarding.clubId : null,
  );

  useEffect(() => {
    if (
      session === null ||
      (identityQuery.state !== "ready" && identityQuery.state !== "empty")
    ) {
      return;
    }
    if (deriveOnboardingStep(identity, session.accountId).kind !== "complete") {
      router.replace("/onboarding");
    }
  }, [identity, identityQuery.state, session]);

  const refresh = useCallback(() => {
    clubQuery.refetch();
    identityQuery.refetch();
    competitionQuery.refetch();
    matchQuery.refetch();
    inboxQuery.refetch();
    automationQuery.refetch();
  }, [
    automationQuery.refetch,
    clubQuery.refetch,
    competitionQuery.refetch,
    identityQuery.refetch,
    inboxQuery.refetch,
    matchQuery.refetch,
  ]);

  const queryState = combinedQueryState([clubQuery.state, identityQuery.state]);
  const screenState = deriveScreenState({
    session: status,
    query: queryState,
    hasCachedData: clubQuery.isStale || identityQuery.isStale,
  });

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<Refresh onRefresh={refresh} />}
      >
        {screenState !== "success" || club === null ? (
          <ScreenStatePanel
            state={screenState === "success" ? "empty" : screenState}
            title={club === null ? "CLUBE AINDA NÃO DEFINIDO" : undefined}
            body={
              club === null
                ? "Conclua a escolha do clube para abrir seu painel de comando."
                : undefined
            }
            onRetry={refresh}
          />
        ) : (
          <>
            <View style={styles.hero}>
              <View style={styles.crest}>
                <ClubCrest
                  {...clubCrestData(
                    club.name,
                    club.primaryColor,
                    club.secondaryColor,
                    club.crestTemplateId,
                  )}
                  size={64}
                />
              </View>
              <View style={styles.heroText}>
                <Text style={styles.eyebrow}>SEU CLUBE</Text>
                <Text style={styles.title}>{club.name}</Text>
                <Text style={styles.subtitle}>
                  {club.stadiumName} ·{" "}
                  {club.stadiumCapacity.toLocaleString("pt-BR")} lugares
                </Text>
              </View>
            </View>

            <Card>
              <SectionHeader
                title="DESDE SUA ÚLTIMA VISITA"
                trailing={
                  <Icon
                    name="notifications"
                    size={17}
                    color={color.textMuted}
                  />
                }
              />
              {inboxQuery.state === "ready" && inboxQuery.data !== null ? (
                <View style={styles.metrics}>
                  <Metric
                    value={inboxQuery.data.openNotificationCount}
                    label="PENDÊNCIAS"
                  />
                  <Metric
                    value={inboxQuery.data.timelineCount}
                    label="EVENTOS NO PERÍODO"
                  />
                  <Metric
                    value={automationQuery.data?.executionCount ?? 0}
                    label="AÇÕES AUTOMÁTICAS"
                  />
                </View>
              ) : (
                <InlineUnavailable
                  loading={inboxQuery.state === "loading"}
                  text="Ainda não há um resumo oficial do período ausente."
                />
              )}
            </Card>

            <Card>
              <SectionHeader
                title="TEMPORADA"
                trailing={
                  <Icon name="football" size={17} color={color.textMuted} />
                }
              />
              {competitionQuery.state === "ready" &&
              competitionQuery.data !== null ? (
                <>
                  <Text style={styles.competitionNote}>
                    {competitionQuery.data.competitionName} ·{" "}
                    {competitionQuery.data.playedMatches}/
                    {competitionQuery.data.totalMatches} partidas
                  </Text>
                  {competitionQuery.data.table.slice(0, 5).map((row, index) => (
                    <View key={row.clubId} style={styles.standingRow}>
                      <Text style={styles.standingPos}>{index + 1}</Text>
                      <Text style={styles.standingName} numberOfLines={1}>
                        {row.clubName}
                      </Text>
                      <Text style={styles.standingStat}>{row.played}</Text>
                      <Text style={styles.standingStat}>
                        {row.goalDifference > 0 ? "+" : ""}
                        {row.goalDifference}
                      </Text>
                      <Text style={styles.standingPoints}>{row.points}</Text>
                    </View>
                  ))}
                  {/* A tabela é derivada dos jogos (R-178): no início da
                      temporada todos zerados; a cada rodada jogada, ela move. */}
                </>
              ) : (
                <InlineUnavailable
                  loading={competitionQuery.state === "loading"}
                  text="A temporada ainda não foi publicada no mundo do jogo."
                />
              )}
            </Card>

            <Card>
              <SectionHeader
                title="PARTIDAS"
                trailing={
                  <Icon name="pulse" size={17} color={color.textMuted} />
                }
              />
              {matchQuery.state === "ready" && matchQuery.data !== null ? (
                <View style={styles.metrics}>
                  <Metric value={matchQuery.data.matchCount} label="CRIADAS" />
                  <Metric
                    value={matchQuery.data.finalCount}
                    label="FINALIZADAS"
                  />
                  <Metric
                    value={matchQuery.data.commandCount}
                    label="COMANDOS"
                  />
                </View>
              ) : (
                <InlineUnavailable
                  loading={matchQuery.state === "loading"}
                  text="Nenhuma partida oficial está disponível agora."
                />
              )}
            </Card>

            <Card>
              <SectionHeader
                title="ESTRUTURA"
                trailing={
                  <Icon name="construct" size={17} color={color.textMuted} />
                }
              />
              <View style={styles.metrics}>
                <Metric value={club.departments.length} label="DEPARTAMENTOS" />
                <Metric
                  value={club.reputationBand}
                  label="FAIXA DE REPUTAÇÃO"
                />
              </View>
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({
  value,
  label,
}: {
  readonly value: number;
  readonly label: string;
}) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function InlineUnavailable({
  loading,
  text,
}: {
  readonly loading: boolean;
  readonly text: string;
}) {
  return (
    <View style={styles.unavailable}>
      <Icon
        name={loading ? "time" : "shield"}
        size={18}
        color={color.warning}
      />
      <Text style={styles.unavailableText}>
        {loading ? "Sincronizando…" : text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.background },
  content: { padding: space.lg, gap: space.lg, paddingBottom: space.xl4 },
  competitionNote: {
    marginTop: space.sm,
    color: color.primary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold as "700",
  },
  standingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingVertical: space.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.border,
  },
  standingPos: {
    width: 18,
    color: color.textMuted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold as "700",
  },
  standingName: {
    flex: 1,
    color: color.text,
    fontSize: fontSize.sm,
  },
  standingStat: {
    width: 28,
    textAlign: "right",
    color: color.textMuted,
    fontSize: fontSize.xs,
  },
  standingPoints: {
    width: 32,
    textAlign: "right",
    color: color.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as "700",
  },
  hero: { flexDirection: "row", alignItems: "center", gap: space.md },
  crest: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  heroText: { flex: 1 },
  eyebrow: {
    color: color.primary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold as "700",
    letterSpacing: 1,
  },
  title: {
    color: color.text,
    fontSize: fontSize.xl2,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
  },
  subtitle: { color: color.textMuted, fontSize: fontSize.xs },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  metric: {
    minWidth: "30%",
    flexGrow: 1,
    backgroundColor: color.backgroundElevated,
    borderRadius: radius.sm,
    padding: space.md,
  },
  metricValue: {
    color: color.primary,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.black as "800",
  },
  metricLabel: {
    color: color.textMuted,
    fontSize: 9,
    fontWeight: fontWeight.bold as "700",
  },
  unavailable: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.sm,
    backgroundColor: color.backgroundElevated,
  },
  unavailableText: { flex: 1, color: color.textMuted, fontSize: fontSize.sm },
});
