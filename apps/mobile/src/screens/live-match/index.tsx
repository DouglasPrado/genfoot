import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { CommandTrackingStatus } from "@grinta/core";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card, SectionHeader } from "@/components/card";
import { Icon } from "@/components/icon";
import { Refresh } from "@/components/refresh";
import { ScreenStatePanel } from "@/components/screen-state-panel";
import {
  selectManagedClub,
  type ClubPortfolioProjection,
} from "@/lib/club-projection";
import {
  submitTrackedCommand,
  type TrackedCommandResult,
} from "@/lib/command-orchestrator";
import { useMobileRealtime } from "@/lib/realtime";
import { deriveScreenState } from "@/lib/screen-state";
import { useSession } from "@/lib/session";
import { useWorldId, useWorldQuery } from "@/lib/world";
import { color, fontSize, fontWeight, radius, space } from "@/theme";
import {
  COACH_ACTIONS,
  buildCoachCommand,
  coachSide,
  nextMatchAction,
  type CoachAction,
} from "./match-actions";

interface MobileMatch {
  readonly id: string;
  readonly homeClubId: string;
  readonly awayClubId: string;
  readonly kickoffOn: string;
  readonly status: "CREATED" | "IN_PROGRESS" | "FINAL";
  readonly result: {
    readonly homeGoals: number;
    readonly awayGoals: number;
    readonly homeShots: number;
    readonly awayShots: number;
    readonly homePossession: number;
  } | null;
  readonly runtime?: {
    readonly currentTick: number;
    readonly totalTicks: number;
    readonly nextSequence: number;
    readonly homeGoals: number;
    readonly awayGoals: number;
    readonly homeShots: number;
    readonly awayShots: number;
  };
  readonly commandLog?: readonly { readonly matchSequence: number }[];
}

interface MatchesProjection {
  readonly matches: readonly MobileMatch[];
  readonly revision: number;
}

/** GP-007: acompanhamento de partidas exclusivamente pelo snapshot oficial. */
export function LiveMatch() {
  const worldId = useWorldId();
  const { client, contractVersion, status } = useSession();
  const worldQuery = useWorldQuery<{ readonly currentDate: string }>("world");
  const matchQuery = useWorldQuery<MatchesProjection>("matches-detail");
  const clubQuery = useWorldQuery<ClubPortfolioProjection>("club-detail");
  const realtime = useMobileRealtime(worldId);
  const clubs = new Map(
    (clubQuery.data?.clubs ?? []).map((club) => [club.id, club.name]),
  );
  const matches = matchQuery.data?.matches ?? [];
  const focus =
    matches.find((match) => match.status === "IN_PROGRESS") ??
    matches.find((match) => match.status === "CREATED") ??
    matches.at(-1) ??
    null;
  const [tracking, setTracking] = useState<TrackedCommandResult | null>(null);
  const [coachTracking, setCoachTracking] = useState<
    (TrackedCommandResult & { readonly actionKey: string }) | null
  >(null);
  const managedClub = selectManagedClub(clubQuery.data, null);
  const mySide =
    focus === null ? null : coachSide(focus, managedClub?.id ?? null);

  /** Ação rápida de treinador → match:submit-command com sequência oficial. */
  const coach = useCallback(
    (coachAction: CoachAction) => {
      if (
        focus === null ||
        focus.status !== "IN_PROGRESS" ||
        focus.runtime === undefined ||
        mySide === null ||
        client === null ||
        contractVersion === null ||
        status !== "online"
      ) {
        return;
      }
      const payload = buildCoachCommand({
        matchId: focus.id,
        side: mySide,
        action: coachAction,
        nextSequence: focus.runtime.nextSequence,
        actor: managedClub?.id ?? "manager",
      });
      const idempotencyKey = `mobile:coach:${focus.id}:${focus.runtime.nextSequence}`;
      setCoachTracking({
        actionKey: coachAction.key,
        status: CommandTrackingStatus.SUBMITTING,
        commandId: null,
        resource: null,
        correlationId: idempotencyKey,
        errorCode: null,
      });
      void submitTrackedCommand(client, {
        clientContractVersion: "v1",
        serverContractVersion: contractVersion,
        commandType: "match:submit-command",
        worldId,
        payload,
        idempotencyKey,
        correlationId: idempotencyKey,
      }).then(async (result) => {
        setCoachTracking({ ...result, actionKey: coachAction.key });
        if (
          result.status === CommandTrackingStatus.ACCEPTED ||
          result.status === CommandTrackingStatus.APPLIED
        ) {
          // Confirma pelo estado oficial: a sequência do runtime avançou.
          const official = await client.query<MatchesProjection>(
            worldId,
            "matches-detail",
          );
          const projected = official.data.matches.find(
            (candidate) => candidate.id === focus.id,
          );
          if (
            (projected?.runtime?.nextSequence ?? 0) >
            focus.runtime!.nextSequence
          ) {
            setCoachTracking({
              ...result,
              actionKey: coachAction.key,
              status: CommandTrackingStatus.APPLIED,
            });
          }
          matchQuery.refetch();
        }
      });
    },
    [
      client,
      contractVersion,
      focus,
      managedClub?.id,
      matchQuery,
      mySide,
      status,
      worldId,
    ],
  );

  const action =
    focus === null || worldQuery.data === null
      ? null
      : nextMatchAction({
          status: focus.status,
          kickoffOn: focus.kickoffOn,
          worldDate: worldQuery.data.currentDate,
          currentTick: focus.runtime?.currentTick,
          totalTicks: focus.runtime?.totalTicks,
        });
  const queryState =
    matchQuery.state === "loading" || clubQuery.state === "loading"
      ? "loading"
      : matchQuery.state === "offline" || clubQuery.state === "offline"
        ? "offline"
        : matchQuery.state === "error" || clubQuery.state === "error"
          ? "error"
          : matchQuery.state === "empty" || clubQuery.state === "empty"
            ? "empty"
            : "ready";
  const screenState = deriveScreenState({
    session: status,
    query: queryState,
    hasCachedData: matchQuery.isStale || clubQuery.isStale,
  });
  const refresh = () => {
    matchQuery.refetch();
    clubQuery.refetch();
    worldQuery.refetch();
  };
  const executeAction = useCallback(() => {
    if (
      focus === null ||
      action?.kind !== "COMMAND" ||
      client === null ||
      contractVersion === null
    ) {
      return;
    }
    const run = () => {
      const idempotencyKey = `mobile:${action.commandType}:${focus.id}:${focus.runtime?.currentTick ?? 0}`;
      setTracking({
        status: CommandTrackingStatus.SUBMITTING,
        commandId: null,
        resource: null,
        correlationId: idempotencyKey,
        errorCode: null,
      });
      void submitTrackedCommand(client, {
        clientContractVersion: "v1",
        serverContractVersion: contractVersion,
        commandType: action.commandType,
        worldId,
        payload: { matchId: focus.id, ...action.payload },
        idempotencyKey,
        correlationId: idempotencyKey,
      }).then(async (result) => {
        setTracking(result);
        if (
          result.status !== CommandTrackingStatus.ACCEPTED &&
          result.status !== CommandTrackingStatus.APPLIED
        ) {
          return;
        }
        const official = await client.query<MatchesProjection>(
          worldId,
          "matches-detail",
        );
        const projected = official.data.matches.find(
          (candidate) => candidate.id === focus.id,
        );
        const applied =
          action.commandType === "match:start"
            ? projected?.status === "IN_PROGRESS"
            : action.commandType === "match:finalize"
              ? projected?.status === "FINAL"
              : (projected?.runtime?.currentTick ?? 0) >
                (focus.runtime?.currentTick ?? 0);
        if (applied) {
          setTracking({ ...result, status: CommandTrackingStatus.APPLIED });
        }
        matchQuery.refetch();
      });
    };
    if (action.irreversible) {
      Alert.alert(
        action.label,
        "Esta ação altera o estado oficial da partida e não pode ser enfileirada offline.",
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Confirmar", style: "destructive", onPress: run },
        ],
      );
    } else {
      run();
    }
  }, [action, client, contractVersion, focus, matchQuery.refetch, worldId]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<Refresh onRefresh={refresh} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>PARTIDAS</Text>
            <Text style={styles.subtitle}>CENTRAL OFICIAL</Text>
          </View>
          <Icon name="trophy" size={28} color={color.primary} />
        </View>

        {screenState !== "success" || focus === null ? (
          <ScreenStatePanel
            state={screenState === "success" ? "empty" : screenState}
            title={focus === null ? "NENHUMA PARTIDA CRIADA" : undefined}
            body={
              focus === null
                ? "O calendário ainda não gerou partidas para este mundo."
                : undefined
            }
            onRetry={refresh}
          />
        ) : (
          <>
            <View
              style={[
                styles.realtime,
                realtime.status === "OFFLINE" ? styles.realtimeOffline : null,
              ]}
              accessibilityLiveRegion="polite"
            >
              <View style={styles.realtimeDot} />
              <Text style={styles.realtimeText}>
                {realtime.status === "LIVE"
                  ? `ESTADO AO VIVO · #${realtime.lastSequence}`
                  : realtime.status === "GAP" ||
                      realtime.status === "RECOVERING"
                    ? "RECUPERANDO SNAPSHOT OFICIAL…"
                    : realtime.status === "OFFLINE"
                      ? "OFFLINE · COMANDOS BLOQUEADOS"
                      : "CONECTANDO…"}
              </Text>
            </View>

            <Card>
              <Text style={styles.kickoff}>{focus.kickoffOn}</Text>
              <View style={styles.scoreRow}>
                <Team name={clubs.get(focus.homeClubId) ?? "Clube mandante"} />
                <View style={styles.scoreBlock}>
                  <Text style={styles.score}>
                    {focus.result?.homeGoals ?? focus.runtime?.homeGoals ?? "–"}
                    <Text style={styles.scoreDivider}> × </Text>
                    {focus.result?.awayGoals ?? focus.runtime?.awayGoals ?? "–"}
                  </Text>
                  <Text style={styles.status}>{statusLabel(focus.status)}</Text>
                </View>
                <Team name={clubs.get(focus.awayClubId) ?? "Clube visitante"} />
              </View>
            </Card>

            {action !== null ? (
              <Pressable
                style={[
                  styles.matchAction,
                  action.kind !== "COMMAND" ? styles.matchActionBlocked : null,
                ]}
                onPress={executeAction}
                disabled={
                  action.kind !== "COMMAND" ||
                  status !== "online" ||
                  tracking?.status === CommandTrackingStatus.SUBMITTING ||
                  tracking?.status === CommandTrackingStatus.ACCEPTED
                }
                accessibilityRole="button"
                accessibilityLabel={action.label}
                accessibilityState={{
                  disabled: action.kind !== "COMMAND" || status !== "online",
                  busy:
                    tracking?.status === CommandTrackingStatus.SUBMITTING ||
                    tracking?.status === CommandTrackingStatus.ACCEPTED,
                }}
              >
                {tracking?.status === CommandTrackingStatus.SUBMITTING ||
                tracking?.status === CommandTrackingStatus.ACCEPTED ? (
                  <ActivityIndicator color={color.primaryContrast} />
                ) : (
                  <Text style={styles.matchActionText}>{action.label}</Text>
                )}
              </Pressable>
            ) : null}

            {tracking?.status === CommandTrackingStatus.REJECTED ? (
              <Text
                style={styles.commandError}
                accessibilityLiveRegion="assertive"
              >
                Ação recusada: {tracking.errorCode ?? "regra da partida"}.
              </Text>
            ) : null}

            {focus.status === "IN_PROGRESS" && mySide !== null ? (
              <Card>
                <SectionHeader
                  title="ÁREA TÉCNICA"
                  trailing={
                    <Icon name="flash" size={16} color={color.textMuted} />
                  }
                />
                <View style={styles.coachRow}>
                  {COACH_ACTIONS.map((coachAction) => {
                    const busy =
                      coachTracking?.actionKey === coachAction.key &&
                      coachTracking.status ===
                        CommandTrackingStatus.SUBMITTING;
                    return (
                      <Pressable
                        key={coachAction.key}
                        style={[
                          styles.coachChip,
                          coachAction.delta > 0
                            ? styles.coachChipAttack
                            : styles.coachChipDefend,
                        ]}
                        onPress={() => coach(coachAction)}
                        disabled={status !== "online" || busy}
                        accessibilityRole="button"
                        accessibilityLabel={`${coachAction.label}: ${coachAction.note}`}
                        accessibilityState={{ busy }}
                      >
                        {busy ? (
                          <ActivityIndicator
                            size="small"
                            color={color.text}
                          />
                        ) : (
                          <>
                            <Text style={styles.coachChipLabel}>
                              {coachAction.label}
                            </Text>
                            <Text style={styles.coachChipNote}>
                              {coachAction.note}
                            </Text>
                          </>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
                {coachTracking?.status === CommandTrackingStatus.APPLIED ? (
                  <Text style={styles.coachApplied}>
                    Instrução aceita pelo motor — vale a partir do próximo
                    avanço.
                  </Text>
                ) : null}
                {coachTracking?.status === CommandTrackingStatus.REJECTED ? (
                  <Text
                    style={styles.commandError}
                    accessibilityLiveRegion="assertive"
                  >
                    Instrução recusada:{" "}
                    {coachTracking.errorCode ?? "janela fechada"}.
                  </Text>
                ) : null}
              </Card>
            ) : null}

            <Card>
              <SectionHeader
                title="ESTADO DA PARTIDA"
                trailing={
                  <Icon name="pulse" size={17} color={color.textMuted} />
                }
              />
              <View style={styles.metrics}>
                <Metric
                  value={
                    focus.result?.homeShots ?? focus.runtime?.homeShots ?? 0
                  }
                  label="CHUTES CASA"
                />
                <Metric
                  value={
                    focus.result?.awayShots ?? focus.runtime?.awayShots ?? 0
                  }
                  label="CHUTES FORA"
                />
                <Metric
                  value={focus.commandLog?.length ?? 0}
                  label="COMANDOS ACEITOS"
                />
              </View>
              {focus.runtime !== undefined ? (
                <Text style={styles.tick}>
                  Tick {focus.runtime.currentTick} de {focus.runtime.totalTicks}
                </Text>
              ) : null}
            </Card>

            <Text style={styles.count}>
              {matches.length} PARTIDA{matches.length === 1 ? "" : "S"} NO MUNDO
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function statusLabel(status: MobileMatch["status"]): string {
  if (status === "IN_PROGRESS") return "EM ANDAMENTO";
  if (status === "FINAL") return "ENCERRADA";
  return "AGENDADA";
}

function Team({ name }: { readonly name: string }) {
  return (
    <View style={styles.team}>
      <View style={styles.teamCrest}>
        <Text style={styles.teamInitial}>{name.charAt(0).toUpperCase()}</Text>
      </View>
      <Text style={styles.teamName} numberOfLines={2}>
        {name}
      </Text>
    </View>
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.background },
  content: { padding: space.lg, gap: space.lg, paddingBottom: space.xl4 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    color: color.text,
    fontSize: fontSize.xl2,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
  },
  subtitle: {
    color: color.primary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold as "700",
    letterSpacing: 0.8,
  },
  realtime: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    borderWidth: 1,
    borderColor: color.primaryDim,
    borderRadius: radius.md,
    backgroundColor: color.backgroundElevated,
    paddingHorizontal: space.md,
  },
  realtimeOffline: { borderColor: color.danger },
  realtimeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: color.primary,
  },
  realtimeText: {
    flex: 1,
    color: color.text,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold as "700",
  },
  kickoff: {
    color: color.textMuted,
    fontSize: fontSize.xs,
    textAlign: "center",
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: space.md,
  },
  team: { flex: 1, alignItems: "center", gap: space.sm },
  teamCrest: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.primaryDim,
    alignItems: "center",
    justifyContent: "center",
  },
  teamInitial: {
    color: color.primary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.black as "800",
  },
  teamName: {
    color: color.text,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold as "700",
    textAlign: "center",
  },
  scoreBlock: { alignItems: "center", paddingHorizontal: space.sm },
  score: {
    color: color.text,
    fontSize: 34,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
  },
  scoreDivider: { color: color.textMuted, fontSize: fontSize.lg },
  status: {
    color: color.primary,
    fontSize: 9,
    fontWeight: fontWeight.bold as "700",
  },
  metrics: { flexDirection: "row", gap: space.sm },
  metric: {
    flex: 1,
    padding: space.md,
    borderRadius: radius.sm,
    backgroundColor: color.backgroundElevated,
    alignItems: "center",
  },
  metricValue: {
    color: color.primary,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.black as "800",
  },
  metricLabel: { color: color.textMuted, fontSize: 8, textAlign: "center" },
  tick: { color: color.textMuted, fontSize: fontSize.xs, marginTop: space.md },
  count: {
    color: color.textFaint,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold as "700",
    textAlign: "center",
  },
  matchAction: {
    minHeight: 52,
    borderRadius: radius.sm,
    backgroundColor: color.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.lg,
  },
  matchActionBlocked: { backgroundColor: color.backgroundElevated },
  matchActionText: {
    color: color.primaryContrast,
    fontWeight: fontWeight.black as "800",
    letterSpacing: 0.8,
  },
  commandError: {
    color: color.danger,
    fontSize: fontSize.xs,
    textAlign: "center",
  },
  coachRow: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  coachChip: {
    width: "47%",
    flexGrow: 1,
    minHeight: 56,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingVertical: space.sm,
  },
  coachChipAttack: {
    borderColor: color.primaryDim,
    backgroundColor: "#151c0e",
  },
  coachChipDefend: {
    borderColor: color.info,
    backgroundColor: color.backgroundElevated,
  },
  coachChipLabel: {
    color: color.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
    letterSpacing: 0.5,
  },
  coachChipNote: { color: color.textMuted, fontSize: 9 },
  coachApplied: {
    color: color.success,
    fontSize: fontSize.xs,
    marginTop: space.sm,
    textAlign: "center",
  },
});
