import { useCallback, useMemo } from "react";
import {
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from "react-native";
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
import {
  FeedMark,
  StatSplit,
  markKindOf,
  sideColor,
} from "@/screens/match/match-visuals";
import { color, fontSize, fontWeight, radius, space } from "@/theme";

/** Arte do bundle (decorativa): o gramado atrás do placar, como no protótipo. */
const FIELD_BG =
  require("../../../assets/home-field-bg.jpg") as ImageSourcePropType;

interface MatchClubBadgeSource {
  readonly clubId: string;
  readonly clubName: string;
  readonly shortCode: string;
  readonly primaryColor: string | null;
  readonly secondaryColor: string | null;
  readonly crestTemplateId: string | null;
}

interface PlayerRatingSource {
  readonly playerId: string;
  readonly playerName: string;
  readonly clubId: string;
  readonly position: string;
  readonly rating: number;
  readonly goals: number;
  readonly assists: number;
  readonly shots: number;
  readonly saves: number;
  readonly yellowCards: number;
  readonly redCards: number;
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
  readonly homeExpectedGoals: number | null;
  readonly awayExpectedGoals: number | null;
  readonly homeShotsOnTarget: number | null;
  readonly awayShotsOnTarget: number | null;
  readonly ratings: readonly PlayerRatingSource[];
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

  const homeColor = sideColor(detail?.home.primaryColor ?? null, color.primary);
  const awayColor = sideColor(detail?.away.primaryColor ?? null, color.info);

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
          <Text style={styles.headerTitle} numberOfLines={1}>
            {detail.finished ? "FIM DE JOGO" : "PARTIDA AGENDADA"}
          </Text>
        </View>

        {/* O placar-herói, na composição do protótipo: etiqueta de estado, a
            competição por cima, escudos nas pontas com o sublinhado na cor do
            clube, e o placar grande no centro. Partida não jogada mostra "×",
            nunca 0–0 — zero a zero é um resultado, e afirmá-lo antes da bola
            rolar seria inventar. */}
        <View style={styles.hero}>
          <ImageBackground
            source={FIELD_BG}
            style={StyleSheet.absoluteFill}
            imageStyle={styles.heroImage}
            resizeMode="cover"
          />
          <View style={styles.heroScrim} pointerEvents="none" />

          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: detail.finished ? color.textFaint : color.primary },
              ]}
            />
            <Text style={styles.statusText}>
              {detail.finished ? "ENCERRADA" : "A JOGAR"}
            </Text>
          </View>
          <Text style={styles.competition} numberOfLines={1}>
            {(detail.competitionName ?? "Amistoso").toUpperCase()} · RODADA{" "}
            {detail.roundNumber}
          </Text>

          <View style={styles.scoreboard}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Ver ${detail.home.clubName}`}
              onPress={() => router.push(`/clubes/${detail.home.clubId}`)}
              style={styles.side}
            >
              <Text style={styles.sideName} numberOfLines={1}>
                {detail.home.clubName}
              </Text>
              <View style={[styles.sideRule, { backgroundColor: homeColor }]} />
              <ClubCrest
                {...clubCrestData(
                  detail.home.clubName,
                  detail.home.primaryColor,
                  detail.home.secondaryColor,
                  detail.home.crestTemplateId,
                )}
                size={64}
              />
            </Pressable>

            <View style={styles.scoreBox}>
              {detail.finished ? (
                <Text style={styles.score}>
                  {detail.homeGoals}
                  <Text style={styles.scoreDash}> - </Text>
                  {detail.awayGoals}
                </Text>
              ) : (
                <Text style={styles.scorePending}>×</Text>
              )}
              <Text style={styles.kickoff}>{detail.scheduledOn}</Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Ver ${detail.away.clubName}`}
              onPress={() => router.push(`/clubes/${detail.away.clubId}`)}
              style={styles.side}
            >
              <Text style={styles.sideName} numberOfLines={1}>
                {detail.away.clubName}
              </Text>
              <View style={[styles.sideRule, { backgroundColor: awayColor }]} />
              <ClubCrest
                {...clubCrestData(
                  detail.away.clubName,
                  detail.away.primaryColor,
                  detail.away.secondaryColor,
                  detail.away.crestTemplateId,
                )}
                size={64}
              />
            </Pressable>
          </View>
        </View>

        {/* A "faixa de estado" do protótipo, traduzida para o pós-jogo: sem
            AGORA para medir, o que resta é COMPARAÇÃO. Cada barra entrega o
            veredito antes de o número ser lido. */}
        {detail.finished ? (
          <Card>
            <SectionHeader title="COMO O JOGO FOI" />
            {detail.homeShots === null || detail.awayShots === null ? (
              <Text style={styles.empty}>
                Esta partida foi jogada antes de o mundo passar a guardar posse
                e finalizações. Os números dela não existem — só o placar.
              </Text>
            ) : (
              <>
                {detail.homePossession !== null ? (
                  <StatSplit
                    label="Posse de bola"
                    home={detail.homePossession}
                    away={100 - detail.homePossession}
                    homeColor={homeColor}
                    awayColor={awayColor}
                    format={(v) => `${v}%`}
                  />
                ) : null}
                <StatSplit
                  label="Finalizações"
                  home={detail.homeShots}
                  away={detail.awayShots}
                  homeColor={homeColor}
                  awayColor={awayColor}
                />
                {detail.homeShotsOnTarget !== null &&
                detail.awayShotsOnTarget !== null ? (
                  <StatSplit
                    label="No alvo"
                    home={detail.homeShotsOnTarget}
                    away={detail.awayShotsOnTarget}
                    homeColor={homeColor}
                    awayColor={awayColor}
                  />
                ) : null}
                {detail.homeExpectedGoals !== null &&
                detail.awayExpectedGoals !== null ? (
                  <StatSplit
                    label="xG · gols esperados"
                    home={detail.homeExpectedGoals}
                    away={detail.awayExpectedGoals}
                    homeColor={homeColor}
                    awayColor={awayColor}
                    format={(v) => v.toFixed(2)}
                  />
                ) : null}
              </>
            )}
          </Card>
        ) : null}

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
                  <View style={styles.halfRow}>
                    <Text style={styles.halfLabel}>
                      {half.half === 1 ? "1º TEMPO" : "2º TEMPO"}
                    </Text>
                    <View style={styles.halfRule} />
                  </View>
                  {half.events.map((event) => {
                    const score = scoreAfterEvent(
                      detail.events,
                      event.sequence,
                      detail.homeClubId,
                    );
                    const kind = markKindOf(event.type);
                    const club =
                      event.side === "home"
                        ? detail.home
                        : event.side === "away"
                          ? detail.away
                          : null;
                    return (
                      <View key={event.sequence} style={styles.eventRow}>
                        <Text style={styles.minute}>{event.minute}&apos;</Text>
                        {/* A espinha: a linha vertical que atravessa a lista e
                            faz dela uma linha do tempo, não uma pilha. */}
                        <View style={styles.spine}>
                          <View style={styles.spineLine} />
                          <FeedMark kind={kind} />
                        </View>
                        <View style={styles.eventText}>
                          <Text
                            style={[
                              styles.eventLabel,
                              kind === "goal" && styles.eventLabelGoal,
                            ]}
                          >
                            {event.label}
                          </Text>
                          <Text style={styles.eventWho} numberOfLines={1}>
                            {event.playerName ?? event.description}
                            {club === null
                              ? ""
                              : ` · ${club.shortCode || club.clubName}`}
                          </Text>
                        </View>
                        {kind === "goal" ? (
                          <Text
                            style={[
                              styles.runningScore,
                              {
                                borderColor:
                                  event.side === "home" ? homeColor : awayColor,
                              },
                            ]}
                          >
                            {score.home}–{score.away}
                          </Text>
                        ) : (
                          <View style={styles.runningScoreGap} />
                        )}
                      </View>
                    );
                  })}
                </View>
              ))
            )}
          </Card>
        )}

        {/* As notas (doc 05 §16). O primeiro é o melhor em campo e o último o
            pior — a ordem já vem do servidor. */}
        {detail.finished && detail.ratings.length > 0 ? (
          <Card>
            <SectionHeader
              title="NOTAS"
              trailing={<Text style={styles.count}>melhor em campo no topo</Text>}
            />
            {detail.ratings.map((row, index) => (
              <View
                key={row.playerId}
                style={[styles.ratingRow, index === 0 && styles.ratingRowBest]}
              >
                <View
                  style={[
                    styles.clubRule,
                    {
                      backgroundColor:
                        row.clubId === detail.awayClubId ? awayColor : homeColor,
                    },
                  ]}
                />
                <View style={styles.eventText}>
                  <Text style={styles.eventLabel} numberOfLines={1}>
                    {row.playerName}
                  </Text>
                  <Text style={styles.eventWho} numberOfLines={1}>
                    {row.position}
                    {row.goals > 0 ? ` · ${row.goals} gol${row.goals > 1 ? "s" : ""}` : ""}
                    {row.assists > 0 ? ` · ${row.assists} assist.` : ""}
                    {row.saves > 0 ? ` · ${row.saves} defesas` : ""}
                    {row.yellowCards > 0 ? " · amarelo" : ""}
                    {row.redCards > 0 ? " · VERMELHO" : ""}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.ratingValue,
                    row.rating >= 7.5 && styles.ratingGood,
                    row.rating < 5 && styles.ratingBad,
                  ]}
                >
                  {row.rating.toFixed(1)}
                </Text>
              </View>
            ))}
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
  headerTitle: {
    flex: 1,
    color: color.text,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
    letterSpacing: 0.5,
  },
  subtitle: { color: color.textMuted, fontSize: fontSize.xs },
  count: { color: color.textMuted, fontSize: fontSize.xs },

  hero: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.borderStrong,
    overflow: "hidden",
    paddingVertical: space.lg,
    paddingHorizontal: space.md,
    gap: space.sm,
  },
  heroImage: { opacity: 0.5 },
  heroScrim: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(10,11,13,0.78)",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: {
    color: color.text,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold as "700",
    letterSpacing: 1,
  },
  competition: {
    textAlign: "center",
    color: color.textMuted,
    fontSize: fontSize.xs,
    letterSpacing: 0.5,
  },
  scoreboard: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: space.sm,
    marginTop: space.xs,
  },
  side: { flex: 1, alignItems: "center", gap: space.xs },
  sideName: {
    color: color.text,
    fontSize: fontSize.xs,
    fontStyle: "italic",
    fontWeight: fontWeight.bold as "700",
    textTransform: "uppercase",
    textAlign: "center",
  },
  /** O sublinhado na cor do clube — o "time da casa/visitante" do protótipo. */
  sideRule: { width: 46, height: 2, borderRadius: 1, marginBottom: space.xs },
  scoreBox: { alignItems: "center", gap: 2, minWidth: 110 },
  score: {
    color: color.text,
    fontSize: fontSize.xl3,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
  },
  scoreDash: { color: color.textFaint, fontSize: fontSize.xl2 },
  scorePending: {
    color: color.textFaint,
    fontSize: fontSize.xl3,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
  },
  kickoff: { color: color.primary, fontSize: fontSize.xs },

  halfRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    marginTop: space.md,
    marginBottom: space.xs,
  },
  halfLabel: {
    color: color.primary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
    letterSpacing: 0.5,
  },
  halfRule: { flex: 1, height: 1, backgroundColor: color.border },
  eventRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  minute: {
    width: 32,
    textAlign: "right",
    color: color.textMuted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold as "700",
  },
  /**
   * A espinha da linha do tempo: a marca do lance fica por cima de uma linha
   * contínua, e é ela que transforma a pilha de linhas em cronologia.
   */
  spine: { width: 30, alignItems: "center", justifyContent: "center" },
  spineLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: color.border,
  },
  eventText: { flex: 1, gap: 2, paddingVertical: space.sm },
  eventLabel: { color: color.text, fontSize: fontSize.sm },
  eventLabelGoal: {
    color: color.primary,
    fontWeight: fontWeight.bold as "700",
  },
  eventWho: { color: color.textMuted, fontSize: fontSize.xs },
  runningScore: {
    minWidth: 48,
    textAlign: "center",
    color: color.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as "700",
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingVertical: 2,
  },
  /** Reserva a coluna do placar para as linhas sem gol não desalinharem. */
  runningScoreGap: { minWidth: 48 },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingRight: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.border,
  },
  /** O melhor em campo ganha fundo, não um enfeite solto ao lado do nome. */
  ratingRowBest: {
    backgroundColor: color.surfaceRaised,
    borderRadius: radius.sm,
    borderTopWidth: 0,
  },
  /** A cor do clube marca de que lado o jogador é, sem repetir o nome do time. */
  clubRule: { width: 3, height: 30, borderRadius: 2 },
  ratingValue: {
    minWidth: 44,
    textAlign: "center",
    color: color.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold as "700",
    backgroundColor: color.background,
    borderRadius: radius.sm,
    paddingVertical: 2,
  },
  ratingGood: { color: color.success },
  ratingBad: { color: color.danger },
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
