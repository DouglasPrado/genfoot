import { useCallback, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { Card } from "@/components/card";
import { Icon } from "@/components/icon";
import { PositionBadge, positionGroupTint } from "@/components/position-badge";
import {
  PlayerSkillCard,
  type PlayerSkillCardData,
} from "@/components/player-skill-card";
import { Refresh } from "@/components/refresh";
import { ScreenStatePanel } from "@/components/screen-state-panel";
import {
  selectManagedClub,
  type ClubPortfolioProjection,
} from "@/lib/club-projection";
import { deriveScreenState } from "@/lib/screen-state";
import { useSession } from "@/lib/session";
import { useWorldQuery } from "@/lib/world";
import {
  deriveOnboardingStep,
  type MobileIdentityProjection,
} from "@/screens/onboarding/onboarding-model";
import type { PositionGroup } from "@/screens/squad/squad-data";
import { color, fontSize, fontWeight, radius, space } from "@/theme";

interface YouthPlayer {
  readonly playerId: string;
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

interface YouthProjection {
  readonly players: readonly YouthPlayer[];
}

/** Setor da posição — o mesmo do Mercado/escalação, pro tingimento do card. */
const SECTOR: Readonly<Record<string, PositionGroup>> = {
  GK: "GOL",
  CB: "DEF", LB: "DEF", RB: "DEF", LWB: "DEF", RWB: "DEF",
  CDM: "MEI", CM: "MEI", CAM: "MEI", LM: "MEI", RM: "MEI",
  LW: "ATA", RW: "ATA", ST: "ATA", CF: "ATA",
};
const sectorOf = (code: string): PositionGroup => SECTOR[code] ?? "MEI";

/** Base (C8) — os jovens em formação; toca no jogador pra ver o card completo. */
export function Youth() {
  const { session, status } = useSession();
  const [inspect, setInspect] = useState<YouthPlayer | null>(null);
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
  const youthQuery = useWorldQuery<YouthProjection>(
    managedClub === null ? null : "youth",
    managedClub === null ? undefined : { clubId: managedClub.id },
  );

  const refresh = useCallback(() => {
    clubQuery.refetch();
    youthQuery.refetch();
  }, [clubQuery.refetch, youthQuery.refetch]);

  const players = useMemo(
    () =>
      [...(youthQuery.data?.players ?? [])].sort(
        (a, b) => b.potential - a.potential,
      ),
    [youthQuery.data],
  );

  const screenState = deriveScreenState({
    session: status,
    query:
      clubQuery.state === "loading" || youthQuery.state === "loading"
        ? "loading"
        : youthQuery.state === "offline"
          ? "offline"
          : youthQuery.state === "error"
            ? "error"
            : "ready",
    hasCachedData: youthQuery.isStale,
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
        <Text style={styles.headerTitle}>BASE</Text>
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
          <Text style={styles.subtitle}>
            {players.length} jovens em formação · nota atual → potencial
          </Text>
          <Card>
            {players.length === 0 ? (
              <Text style={styles.empty}>Sem categoria de base.</Text>
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
                  <Text style={styles.ovr}>
                    {p.overall}
                    <Text style={styles.pot}> → {p.potential}</Text>
                  </Text>
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
                        position: inspect.primaryPosition,
                        positionTint: positionGroupTint(
                          sectorOf(inspect.primaryPosition),
                        ),
                        age: inspect.age,
                        ovr: inspect.overall,
                        pot: inspect.potential,
                        groups: inspect.groups ?? null,
                        attributes: inspect.attributes ?? null,
                      } satisfies PlayerSkillCardData
                    }
                  />
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingVertical: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.border,
  },
  info: { flex: 1, gap: 2 },
  name: {
    color: color.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as "700",
  },
  meta: { color: color.textMuted, fontSize: fontSize.xs },
  ovr: {
    minWidth: 72,
    textAlign: "right",
    color: color.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold as "700",
  },
  pot: { color: color.primary, fontSize: fontSize.sm },
  empty: {
    color: color.textMuted,
    fontSize: fontSize.sm,
    paddingVertical: space.sm,
  },
  inspectRoot: { flex: 1 },
  inspectBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  inspectWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: space.lg,
  },
  inspectCard: { width: "100%", maxWidth: 400, gap: space.md },
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
