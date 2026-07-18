import { useCallback, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { CommandTrackingStatus } from "@grinta/core";

import { Card } from "@/components/card";
import { Icon } from "@/components/icon";
import { PositionBadge, positionGroupTint } from "@/components/position-badge";
import {
  PlayerSkillCard,
  type PlayerCardCrest,
  type PlayerSkillCardData,
} from "@/components/player-skill-card";
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
import { deriveScreenState } from "@/lib/screen-state";
import { useSession } from "@/lib/session";
import { useWorldId, useWorldQuery } from "@/lib/world";
import { clubCrestData } from "@/screens/club/customization/visual-identity";
import {
  deriveOnboardingStep,
  type MobileIdentityProjection,
} from "@/screens/onboarding/onboarding-model";
import type { PositionGroup } from "@/screens/squad/squad-data";
import { color, fontSize, fontWeight, radius, space } from "@/theme";

interface RosterPlayer {
  readonly playerId: string;
  readonly shirtNumber: number;
  readonly name: string;
  readonly primaryPosition: string;
  readonly overall: number;
  readonly potential: number;
  readonly age: number;
  readonly groups?: {
    readonly technical: number;
    readonly physical: number;
    readonly mental: number;
    readonly goalkeeping: number | null;
  } | null;
  readonly attributes?: Record<string, number | null> | null;
}

interface RosterProjection {
  readonly squadName: string;
  readonly players: readonly RosterPlayer[];
}

const SECTOR: Readonly<Record<string, PositionGroup>> = {
  GK: "GOL",
  CB: "DEF", LB: "DEF", RB: "DEF", LWB: "DEF", RWB: "DEF",
  CDM: "MEI", CM: "MEI", CAM: "MEI", LM: "MEI", RM: "MEI",
  LW: "ATA", RW: "ATA", ST: "ATA", CF: "ATA",
};
const sectorOf = (code: string): PositionGroup => SECTOR[code] ?? "MEI";

const FILTERS = ["TODOS", "GOL", "DEF", "MEI", "ATA"] as const;
type Filter = (typeof FILTERS)[number];

/** Elenco — a lista de TODOS os jogadores do time (separada da formação tática). */
export function RosterList() {
  const { session, status, client, contractVersion } = useSession();
  const worldId = useWorldId();
  const [inspect, setInspect] = useState<RosterPlayer | null>(null);
  const [filter, setFilter] = useState<Filter>("TODOS");
  const [actingId, setActingId] = useState<string | null>(null);
  const [tracking, setTracking] = useState<TrackedCommandResult | null>(null);
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
  const rosterQuery = useWorldQuery<RosterProjection>(
    managedClub === null ? null : "roster",
    managedClub === null ? undefined : { clubId: managedClub.id },
  );

  // O crest do clube gerido — a "foto" do avatar do card (o domínio não tem foto
  // de jogador; o avatar mostra o escudo, como no Mercado e na escalação).
  const crest = useMemo<PlayerCardCrest | null>(
    () =>
      managedClub === null
        ? null
        : clubCrestData(
            managedClub.name,
            managedClub.primaryColor,
            managedClub.secondaryColor,
            managedClub.crestTemplateId,
          ),
    [managedClub],
  );

  const refresh = useCallback(() => {
    clubQuery.refetch();
    rosterQuery.refetch();
  }, [clubQuery.refetch, rosterQuery.refetch]);

  /** Despacha uma ação de elenco (dispensar/descer). Fecha o card ao aplicar. */
  const act = useCallback(
    (commandType: string, playerId: string) => {
      if (managedClub === null || client === null || contractVersion === null) {
        return;
      }
      const idempotencyKey = `${commandType}:${managedClub.id}:${playerId}`;
      setActingId(playerId);
      void submitTrackedCommand(client, {
        clientContractVersion: "v1",
        serverContractVersion: contractVersion,
        commandType,
        worldId,
        payload: { clubId: managedClub.id, playerId },
        idempotencyKey,
        correlationId: `mobile:${idempotencyKey}`,
      }).then((result) => {
        setTracking(result);
        setActingId(null);
        if (
          result.status === CommandTrackingStatus.ACCEPTED ||
          result.status === CommandTrackingStatus.APPLIED
        ) {
          setInspect(null);
          rosterQuery.refetch();
        }
      });
    },
    [client, contractVersion, managedClub, worldId, rosterQuery],
  );

  const players = useMemo(() => {
    const all = [...(rosterQuery.data?.players ?? [])].sort(
      (a, b) => b.overall - a.overall,
    );
    if (filter === "TODOS") return all;
    return all.filter((p) => sectorOf(p.primaryPosition) === filter);
  }, [rosterQuery.data, filter]);

  const total = rosterQuery.data?.players.length ?? 0;
  const screenState = deriveScreenState({
    session: status,
    query:
      clubQuery.state === "loading" || rosterQuery.state === "loading"
        ? "loading"
        : rosterQuery.state === "offline"
          ? "offline"
          : rosterQuery.state === "error"
            ? "error"
            : "ready",
    hasCachedData: rosterQuery.isStale,
  });

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Voltar ao elenco"
          accessibilityState={{}}
          hitSlop={8}
          style={styles.back}
        >
          <Icon name="arrow-back" size={22} color={color.text} />
        </Pressable>
        <Text style={styles.headerTitle}>ELENCO</Text>
        <View style={styles.back} />
      </View>

      {screenState !== "success" || managedClub === null ? (
        <View style={styles.content}>
          <ScreenStatePanel
            state={screenState === "success" ? "empty" : screenState}
            onRetry={refresh}
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<Refresh onRefresh={refresh} />}
        >
          <Text style={styles.subtitle}>{total} jogadores no elenco</Text>
          <View style={styles.filters}>
            {FILTERS.map((f) => (
              <Pressable
                key={f}
                onPress={() => setFilter(f)}
                accessibilityRole="button"
                accessibilityLabel={`Filtrar por ${f}`}
                accessibilityState={{ selected: filter === f }}
                style={[styles.chip, filter === f && styles.chipActive]}
              >
                <Text
                  style={[styles.chipText, filter === f && styles.chipTextActive]}
                >
                  {f}
                </Text>
              </Pressable>
            ))}
          </View>
          <Card>
            {players.length === 0 ? (
              <Text style={styles.empty}>Nenhum jogador nesta posição.</Text>
            ) : (
              players.map((p) => (
                <Pressable
                  key={p.playerId}
                  onPress={() => setInspect(p)}
                  accessibilityRole="button"
                  accessibilityLabel={`Ver ${p.name}`}
                  accessibilityState={{}}
                  style={styles.row}
                >
                  <Text style={styles.shirt}>{p.shirtNumber}</Text>
                  <PositionBadge
                    label={p.primaryPosition}
                    tint={positionGroupTint(sectorOf(p.primaryPosition))}
                  />
                  <View style={styles.info}>
                    <Text style={styles.name} numberOfLines={1}>
                      {p.name}
                    </Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {p.age} anos
                    </Text>
                  </View>
                  <Text style={styles.ovr}>{p.overall}</Text>
                </Pressable>
              ))
            )}
          </Card>
        </ScrollView>
      )}

      <Modal
        visible={inspect !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setInspect(null)}
      >
        <View style={styles.inspectRoot}>
          <Pressable
            style={styles.inspectBackdrop}
            onPress={() => setInspect(null)}
          />
          <View style={styles.inspectWrap} pointerEvents="box-none">
            <View style={styles.inspectCard}>
              {inspect !== null && (
                <>
                  <PlayerSkillCard
                    data={
                      {
                        name: inspect.name,
                        number: inspect.shirtNumber,
                        position: inspect.primaryPosition,
                        positionTint: positionGroupTint(
                          sectorOf(inspect.primaryPosition),
                        ),
                        age: inspect.age,
                        ovr: inspect.overall,
                        pot: inspect.potential,
                        groups: inspect.groups ?? null,
                        attributes: inspect.attributes ?? null,
                        crest,
                      } satisfies PlayerSkillCardData
                    }
                  />
                  <View style={styles.actions}>
                    {inspect.age <= 21 ? (
                      <Pressable
                        onPress={() =>
                          act("youth:demote-player", inspect.playerId)
                        }
                        disabled={actingId !== null}
                        accessibilityRole="button"
                        accessibilityLabel={`Descer ${inspect.name} à base`}
                        accessibilityState={{ disabled: actingId !== null }}
                        style={styles.actionGhost}
                      >
                        <Icon name="arrow-down" size={14} color={color.textMuted} />
                        <Text style={styles.actionGhostText}>À BASE</Text>
                      </Pressable>
                    ) : null}
                    <Pressable
                      onPress={() =>
                        act("market:list-player", inspect.playerId)
                      }
                      disabled={actingId !== null}
                      accessibilityRole="button"
                      accessibilityLabel={`Colocar ${inspect.name} à venda`}
                      accessibilityState={{ disabled: actingId !== null }}
                      style={styles.actionSell}
                    >
                      <Icon name="cart" size={14} color={color.background} />
                      <Text style={styles.actionSellText}>À VENDA</Text>
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        act("market:release-player", inspect.playerId)
                      }
                      disabled={actingId !== null}
                      accessibilityRole="button"
                      accessibilityLabel={`Dispensar ${inspect.name}`}
                      accessibilityState={{ disabled: actingId !== null }}
                      style={styles.actionDanger}
                    >
                      <Text style={styles.actionDangerText}>
                        {actingId !== null ? "..." : "DISPENSAR"}
                      </Text>
                    </Pressable>
                  </View>
                  {tracking?.status === CommandTrackingStatus.REJECTED && (
                    <Text style={styles.actionError}>
                      Recusado: {tracking.errorCode ?? "erro"}.
                    </Text>
                  )}
                  <Pressable
                    onPress={() => setInspect(null)}
                    accessibilityRole="button"
                    accessibilityLabel="Fechar card"
                    accessibilityState={{}}
                    style={styles.inspectClose}
                  >
                    <Text style={styles.inspectCloseText}>FECHAR</Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  back: { width: 32, alignItems: "flex-start" },
  headerTitle: {
    color: color.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold as "700",
    letterSpacing: 0.5,
  },
  content: { padding: space.lg, gap: space.md },
  subtitle: { color: color.textMuted, fontSize: fontSize.sm },
  filters: { flexDirection: "row", gap: space.xs, flexWrap: "wrap" },
  chip: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
    backgroundColor: color.surface,
  },
  chipActive: { backgroundColor: color.primary },
  chipText: {
    color: color.textMuted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold as "700",
  },
  chipTextActive: { color: color.background },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingVertical: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.border,
  },
  shirt: {
    minWidth: 22,
    textAlign: "center",
    color: color.textMuted,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as "700",
  },
  info: { flex: 1, gap: 2 },
  name: {
    color: color.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as "700",
  },
  meta: { color: color.textMuted, fontSize: fontSize.xs },
  ovr: {
    minWidth: 32,
    textAlign: "right",
    color: color.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold as "700",
  },
  empty: {
    color: color.textMuted,
    fontSize: fontSize.sm,
    paddingVertical: space.sm,
  },
  inspectRoot: { flex: 1 },
  inspectBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  inspectWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: space.lg,
  },
  inspectCard: { width: "100%", maxWidth: 400, gap: space.md },
  actions: { flexDirection: "row", justifyContent: "center", gap: space.sm },
  actionGhost: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.border,
  },
  actionGhostText: {
    color: color.textMuted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold as "700",
    letterSpacing: 0.5,
  },
  actionSell: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    backgroundColor: color.primary,
  },
  actionSellText: {
    color: color.background,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold as "700",
    letterSpacing: 0.5,
  },
  actionDanger: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.danger,
  },
  actionDangerText: {
    color: color.danger,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold as "700",
    letterSpacing: 0.5,
  },
  actionError: {
    color: color.danger,
    fontSize: fontSize.sm,
    textAlign: "center",
  },
  inspectClose: {
    alignSelf: "center",
    paddingHorizontal: space.xl,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    backgroundColor: color.surface,
  },
  inspectCloseText: {
    color: color.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as "700",
  },
});
