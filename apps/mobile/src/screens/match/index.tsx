import { useCallback, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";

import { Card, SectionHeader } from "@/components/card";
import { Icon } from "@/components/icon";
import { Refresh } from "@/components/refresh";
import { ScreenStatePanel } from "@/components/screen-state-panel";
import { deriveScreenState } from "@/lib/screen-state";
import { useSession } from "@/lib/session";
import { useWorldQuery } from "@/lib/world";
import { ClubCrest } from "@/screens/club/customization/crest";
import { clubCrestData } from "@/screens/club/customization/visual-identity";
import {
  buildTimeline,
  missingFeedFamilies,
  scoreAfterEvent,
  type MatchFeedCoverageSource,
  type MatchFeedEventSource,
} from "@/screens/match/match-model";
import { color, fontSize, fontWeight, radius, space } from "@/theme";

interface MatchClubBadgeSource {
  readonly clubId: string;
  readonly clubName: string;
  readonly shortCode: string;
  readonly primaryColor: string | null;
  readonly secondaryColor: string | null;
  readonly crestTemplateId: string | null;
}

interface MatchDetailProjection {
  readonly matchId: string;
  readonly roundNumber: number;
  readonly scheduledOn: string;
  readonly runtimeStatus: string;
  readonly finished: boolean;
  readonly homeClubId: string;
  readonly awayClubId: string;
  readonly home: MatchClubBadgeSource;
  readonly away: MatchClubBadgeSource;
  readonly competitionName: string | null;
  readonly homeGoals: number | null;
  readonly awayGoals: number | null;
  readonly homeShots: number | null;
  readonly awayShots: number | null;
  readonly homePossession: number | null;
  readonly events: readonly MatchFeedEventSource[];
  readonly feedCoverage: MatchFeedCoverageSource;
}

/**
 * `M-POSTMATCH` — o que aconteceu na partida.
 *
 * Lê o feed OFICIAL (`match-detail`): o cliente não simula nada e não completa
 * lance nenhum. Partida ainda não jogada não vira relatório — ela tem o seu
 * próprio estado, com a data do jogo.
 */
export function Match() {
  const params = useLocalSearchParams<{ matchId?: string }>();
  const matchId = params.matchId ?? null;
  const { status } = useSession();

  const query = useWorldQuery<MatchDetailProjection>(
    matchId === null ? null : "match-detail",
    matchId === null ? undefined : { matchId },
  );
  const detail = query.data;

  const halves = useMemo(
    () =>
      detail == null ? [] : buildTimeline(detail.events, detail.homeClubId),
    [detail],
  );
  const missing = useMemo(
    () => (detail == null ? [] : missingFeedFamilies(detail.feedCoverage)),
    [detail],
  );

  const refresh = useCallback(() => query.refetch(), [query.refetch]);

  const screenState = deriveScreenState({
    session: status,
    query:
      query.state === "loading"
        ? "loading"
        : query.state === "offline"
          ? "offline"
          : query.state === "error"
            ? "error"
            : "ready",
    hasCachedData: query.isStale,
  });

  if (screenState !== "success" || detail == null || matchId === null) {
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
            <Text style={styles.title}>
              {detail.finished ? "FIM DE JOGO" : "PARTIDA AGENDADA"}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {detail.competitionName ?? "Amistoso"} · rodada{" "}
              {detail.roundNumber} · {detail.scheduledOn}
            </Text>
          </View>
        </View>

        {/* O placar. Partida não jogada mostra "×", nunca 0–0: zero a zero é um
            resultado, e afirmá-lo antes da bola rolar seria inventar. */}
        <Card>
          <View style={styles.scoreboard}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Ver ${detail.home.clubName}`}
              onPress={() => router.push(`/clubes/${detail.home.clubId}`)}
              style={styles.side}
            >
              <ClubCrest
                {...clubCrestData(
                  detail.home.clubName,
                  detail.home.primaryColor,
                  detail.home.secondaryColor,
                  detail.home.crestTemplateId,
                )}
                size={56}
              />
              <Text style={styles.sideName} numberOfLines={2}>
                {detail.home.clubName}
              </Text>
            </Pressable>

            <View style={styles.scoreBox}>
              {detail.finished ? (
                <Text style={styles.score}>
                  {detail.homeGoals}–{detail.awayGoals}
                </Text>
              ) : (
                <Text style={styles.scorePending}>×</Text>
              )}
              <Text style={styles.scoreCaption}>
                {detail.finished ? "encerrada" : "a jogar"}
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Ver ${detail.away.clubName}`}
              onPress={() => router.push(`/clubes/${detail.away.clubId}`)}
              style={styles.side}
            >
              <ClubCrest
                {...clubCrestData(
                  detail.away.clubName,
                  detail.away.primaryColor,
                  detail.away.secondaryColor,
                  detail.away.crestTemplateId,
                )}
                size={56}
              />
              <Text style={styles.sideName} numberOfLines={2}>
                {detail.away.clubName}
              </Text>
            </Pressable>
          </View>
        </Card>

        {!detail.finished ? (
          <Card>
            <SectionHeader title="AINDA NÃO ROLOU" />
            <Text style={styles.empty}>
              Esta partida está marcada para {detail.scheduledOn}. Quando o
              mundo a jogar, o que aconteceu aparece aqui.
            </Text>
          </Card>
        ) : (
          <Card>
            <SectionHeader
              title="O QUE ACONTECEU"
              trailing={
                <Text style={styles.count}>{detail.events.length} lances</Text>
              }
            />
            {halves.length === 0 ? (
              <Text style={styles.empty}>
                O motor não registrou nenhum lance nesta partida — nem os gols
                do placar. O resultado é oficial; o relato dele não foi gravado.
              </Text>
            ) : (
              halves.map((half) => (
                <View key={half.half}>
                  <Text style={styles.halfLabel}>
                    {half.half === 1 ? "1º TEMPO" : "2º TEMPO"}
                  </Text>
                  {half.events.map((event) => {
                    const score = scoreAfterEvent(
                      detail.events,
                      event.sequence,
                      detail.homeClubId,
                    );
                    return (
                      <View key={event.sequence} style={styles.eventRow}>
                        <Text style={styles.minute}>{event.minute}'</Text>
                        <View
                          style={[
                            styles.sideMark,
                            event.side === "home" && styles.sideMarkHome,
                            event.side === "away" && styles.sideMarkAway,
                          ]}
                        />
                        <View style={styles.eventText}>
                          <Text style={styles.eventLabel}>{event.label}</Text>
                          <Text style={styles.eventWho} numberOfLines={1}>
                            {event.playerName ?? event.description}
                            {event.side === null
                              ? ""
                              : event.side === "home"
                                ? ` · ${detail.home.shortCode || detail.home.clubName}`
                                : ` · ${detail.away.shortCode || detail.away.clubName}`}
                          </Text>
                        </View>
                        <Text style={styles.runningScore}>
                          {score.home}–{score.away}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ))
            )}
          </Card>
        )}

        {/* Estatísticas de time: o que o kernel produz. Partida jogada ANTES
            da migration não tem os números — e aí a tela diz isso, em vez de
            mostrar zero, que se leria como "não finalizaram uma vez". */}
        {detail.finished ? (
          <Card>
            <SectionHeader title="NÚMEROS DO JOGO" />
            {detail.homeShots === null || detail.awayShots === null ? (
              <Text style={styles.empty}>
                Esta partida foi jogada antes de o mundo passar a guardar posse
                e finalizações. Os números dela não existem — só o placar.
              </Text>
            ) : (
              <>
                <StatLine
                  label="Finalizações"
                  home={detail.homeShots}
                  away={detail.awayShots}
                />
                {detail.homePossession !== null ? (
                  <StatLine
                    label="Posse de bola"
                    home={`${detail.homePossession}%`}
                    away={`${100 - detail.homePossession}%`}
                  />
                ) : null}
                <StatLine
                  label="Gols"
                  home={detail.homeGoals ?? 0}
                  away={detail.awayGoals ?? 0}
                />
              </>
            )}
          </Card>
        ) : null}

        {/*
          O buraco declarado. Sem isto, um 3×1 com 4 linhas de feed se lê como
          jogo morno — quando o que houve é o motor não gravar o resto.
        */}
        {detail.finished && missing.length > 0 ? (
          <Card>
            <SectionHeader title="O QUE NÃO FOI REGISTRADO" />
            <Text style={styles.unavailableTitle}>
              O motor de partida ainda não produz {missing.join(", ")}.
            </Text>
            <Text style={styles.empty}>
              O relato acima está completo em relação ao que o mundo gravou, não
              em relação ao que um jogo tem. Nenhum cartão aparecer aqui não
              significa jogo limpo — significa que cartão não é simulado.
            </Text>
          </Card>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Uma linha de estatística: casa · rótulo · visitante, como num placar. */
function StatLine({
  label,
  home,
  away,
}: {
  label: string;
  home: string | number;
  away: string | number;
}) {
  return (
    <View style={styles.statLine}>
      <Text style={styles.statValue}>{home}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{away}</Text>
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
  count: { color: color.textMuted, fontSize: fontSize.xs },

  scoreboard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.sm,
  },
  side: { flex: 1, alignItems: "center", gap: space.sm },
  sideName: {
    color: color.text,
    fontSize: fontSize.sm,
    textAlign: "center",
  },
  scoreBox: { alignItems: "center", gap: space.xs, minWidth: 88 },
  score: {
    color: color.text,
    fontSize: fontSize.xl2,
    fontWeight: fontWeight.black as "800",
  },
  scorePending: {
    color: color.textFaint,
    fontSize: fontSize.xl2,
    fontWeight: fontWeight.black as "800",
  },
  scoreCaption: { color: color.textMuted, fontSize: fontSize.xs },

  halfLabel: {
    color: color.primary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold as "700",
    marginTop: space.md,
    marginBottom: space.xs,
  },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingVertical: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.border,
  },
  minute: {
    width: 34,
    color: color.textMuted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold as "700",
  },
  sideMark: {
    width: 3,
    height: 22,
    borderRadius: 2,
    backgroundColor: color.border,
  },
  sideMarkHome: { backgroundColor: color.primary },
  sideMarkAway: { backgroundColor: color.info },
  eventText: { flex: 1, gap: 2 },
  eventLabel: { color: color.text, fontSize: fontSize.sm },
  eventWho: { color: color.textMuted, fontSize: fontSize.xs },
  runningScore: {
    minWidth: 44,
    textAlign: "center",
    color: color.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as "700",
    backgroundColor: color.background,
    borderRadius: radius.sm,
    paddingVertical: 2,
  },

  statLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.sm,
    paddingVertical: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.border,
  },
  statValue: {
    minWidth: 44,
    textAlign: "center",
    color: color.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold as "700",
  },
  statLabel: { flex: 1, textAlign: "center", color: color.textMuted, fontSize: fontSize.xs },
  unavailableTitle: {
    color: color.warning,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as "700",
    marginBottom: space.xs,
  },
  empty: {
    color: color.textMuted,
    fontSize: fontSize.sm,
    paddingVertical: space.sm,
  },
});
