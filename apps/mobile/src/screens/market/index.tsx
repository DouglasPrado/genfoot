import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card, SectionHeader } from "@/components/card";
import { Refresh } from "@/components/refresh";
import { ScreenStatePanel } from "@/components/screen-state-panel";
import {
  selectManagedClub,
  type ClubPortfolioProjection,
} from "@/lib/club-projection";
import { CommandTrackingStatus } from "@grinta/core";

import {
  submitTrackedCommand,
  type TrackedCommandResult,
} from "@/lib/command-orchestrator";
import { deriveScreenState } from "@/lib/screen-state";
import { useSession } from "@/lib/session";
import { useWorldId, useWorldQuery } from "@/lib/world";
import {
  deriveOnboardingStep,
  type MobileIdentityProjection,
} from "@/screens/onboarding/onboarding-model";
import { color, fontSize, fontWeight, formatAmount, radius, space } from "@/theme";

interface MarketPlayer {
  readonly playerId: string;
  readonly name: string;
  readonly clubId: string;
  readonly clubName: string;
  readonly primaryPosition: string;
  readonly age: number;
  readonly overall: number;
  readonly potential: number;
  readonly valueMinor: string;
}

interface MarketProjection {
  readonly players: readonly MarketPlayer[];
}

/** Cores por setor, como no app: goleiro, defesa, meio, ataque. */
const POSITION: Readonly<Record<string, { label: string; tint: string }>> = {
  GK: { label: "GOL", tint: "#F59E0B" },
  CB: { label: "ZAG", tint: "#38BDF8" },
  LB: { label: "LE", tint: "#38BDF8" },
  RB: { label: "LD", tint: "#38BDF8" },
  LWB: { label: "ALA", tint: "#38BDF8" },
  RWB: { label: "ALA", tint: "#38BDF8" },
  CDM: { label: "VOL", tint: "#34D399" },
  CM: { label: "MC", tint: "#34D399" },
  CAM: { label: "MEI", tint: "#34D399" },
  LM: { label: "ME", tint: "#34D399" },
  RM: { label: "MD", tint: "#34D399" },
  LW: { label: "PE", tint: "#F87171" },
  RW: { label: "PD", tint: "#F87171" },
  ST: { label: "ATA", tint: "#F87171" },
  CF: { label: "CA", tint: "#F87171" },
};

const FILTERS = ["TODOS", "GOL", "DEF", "MEI", "ATA"] as const;
type Filter = (typeof FILTERS)[number];

const SECTOR: Readonly<Record<string, Filter>> = {
  GK: "GOL",
  CB: "DEF", LB: "DEF", RB: "DEF", LWB: "DEF", RWB: "DEF",
  CDM: "MEI", CM: "MEI", CAM: "MEI", LM: "MEI", RM: "MEI",
  LW: "ATA", RW: "ATA", ST: "ATA", CF: "ATA",
};

/** Mercado: a vitrine de jogadores do mundo, com valor estimado (R-41). */
export function Market() {
  const { session, status, client, contractVersion } = useSession();
  const worldId = useWorldId();
  const [filter, setFilter] = useState<Filter>("TODOS");
  const [signingId, setSigningId] = useState<string | null>(null);
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
  const marketQuery = useWorldQuery<MarketProjection>(
    managedClub === null ? null : "market",
    managedClub === null ? undefined : { clubId: managedClub.id },
  );

  const refresh = useCallback(() => {
    clubQuery.refetch();
    marketQuery.refetch();
  }, [clubQuery.refetch, marketQuery.refetch]);

  /**
   * A compra de verdade (R-192). Oferta a 100% do valor estimado — dentro da
   * faixa da R-26 (40–250%) —, o servidor decide (não presume sucesso). Ao
   * aplicar, o elenco e o caixa mudam: refaz clube e mercado.
   */
  const signPlayer = useCallback(
    (p: MarketPlayer) => {
      if (managedClub === null || client === null || contractVersion === null) {
        return;
      }
      const idempotencyKey = `sign:${managedClub.id}:${p.playerId}`;
      setSigningId(p.playerId);
      setTracking({
        status: CommandTrackingStatus.SUBMITTING,
        commandId: null,
        resource: null,
        correlationId: `mobile:${idempotencyKey}`,
        errorCode: null,
      });
      void submitTrackedCommand(client, {
        clientContractVersion: "v1",
        serverContractVersion: contractVersion,
        commandType: "market:sign-player",
        worldId,
        payload: {
          buyingClubId: managedClub.id,
          sellerClubId: p.clubId,
          playerId: p.playerId,
          // Minor units, string — a taxa é o valor cheio (100%).
          feeMinor: p.valueMinor,
          currentSeason: 1,
        },
        idempotencyKey,
        correlationId: `mobile:${idempotencyKey}`,
      }).then((result) => {
        setTracking(result);
        setSigningId(null);
        if (
          result.status === CommandTrackingStatus.ACCEPTED ||
          result.status === CommandTrackingStatus.APPLIED
        ) {
          clubQuery.refetch();
          marketQuery.refetch();
        }
      });
    },
    [client, clubQuery, contractVersion, managedClub, marketQuery, worldId],
  );

  const players = useMemo(() => {
    const all = marketQuery.data?.players ?? [];
    if (filter === "TODOS") return all;
    return all.filter((p) => SECTOR[p.primaryPosition] === filter);
  }, [marketQuery.data, filter]);

  const screenState = deriveScreenState({
    session: status,
    query:
      clubQuery.state === "loading" || marketQuery.state === "loading"
        ? "loading"
        : marketQuery.state === "offline"
          ? "offline"
          : marketQuery.state === "error"
            ? "error"
            : "ready",
    hasCachedData: marketQuery.isStale,
  });

  if (screenState !== "success" || managedClub === null) {
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
          <Text style={styles.title}>MERCADO</Text>
          <Text style={styles.subtitle}>
            {players.length} jogadores · valor estimado
          </Text>
        </View>

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
          <SectionHeader title="OBSERVAR" />
          {players.length === 0 ? (
            <Text style={styles.empty}>Nenhum jogador nesta posição.</Text>
          ) : (
            players.map((p) => {
              const pos = POSITION[p.primaryPosition] ?? {
                label: p.primaryPosition,
                tint: color.textMuted,
              };
              const own = p.clubId === managedClub.id;
              const busy = signingId === p.playerId;
              return (
                <View key={p.playerId} style={styles.row}>
                  <View style={[styles.posBadge, { backgroundColor: pos.tint }]}>
                    <Text style={styles.posText}>{pos.label}</Text>
                  </View>
                  <View style={styles.info}>
                    <Text style={styles.name} numberOfLines={1}>
                      {p.name}
                    </Text>
                    <Text style={styles.club} numberOfLines={1}>
                      {p.clubName} · {p.age} anos · R${" "}
                      {formatAmount(Number(p.valueMinor) / 100)}
                    </Text>
                  </View>
                  <Text style={styles.ovr}>{p.overall}</Text>
                  {own ? (
                    <Text style={styles.ownTag}>SEU</Text>
                  ) : (
                    <Pressable
                      onPress={() => signPlayer(p)}
                      disabled={busy || signingId !== null}
                      accessibilityRole="button"
                      accessibilityLabel={`Contratar ${p.name}`}
                      accessibilityState={{ disabled: busy || signingId !== null }}
                      style={[styles.signBtn, busy && styles.signBtnBusy]}
                    >
                      <Text style={styles.signText}>
                        {busy ? "..." : "CONTRATAR"}
                      </Text>
                    </Pressable>
                  )}
                </View>
              );
            })
          )}
        </Card>

        {tracking !== null &&
          tracking.status === CommandTrackingStatus.REJECTED && (
            <Text style={styles.error}>
              Contratação recusada: {tracking.errorCode ?? "erro"}.
            </Text>
          )}
        {tracking !== null &&
          (tracking.status === CommandTrackingStatus.ACCEPTED ||
            tracking.status === CommandTrackingStatus.APPLIED) && (
            <Text style={styles.ok}>
              Contratado. Caixa e elenco atualizados.
            </Text>
          )}

        <Text style={styles.note}>
          Valor estimado (R-41). A oferta sai a 100% do valor — a taxa fica na
          faixa da R-26 (40–250%). Dinheiro, contrato e elenco mudam num só ato
          (R-192).
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.background },
  content: { padding: space.lg, gap: space.md },
  header: { gap: space.xs },
  title: {
    color: color.text,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold as "700",
  },
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
  posBadge: {
    width: 38,
    paddingVertical: 3,
    borderRadius: radius.sm,
    alignItems: "center",
  },
  posText: {
    color: "#0B0B0D",
    fontSize: 10,
    fontWeight: fontWeight.bold as "700",
  },
  info: { flex: 1 },
  name: {
    color: color.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as "700",
  },
  club: { color: color.textMuted, fontSize: fontSize.xs },
  ovr: {
    minWidth: 28,
    textAlign: "center",
    color: color.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as "700",
  },
  signBtn: {
    minWidth: 96,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
    backgroundColor: color.primary,
    alignItems: "center",
  },
  signBtnBusy: { backgroundColor: color.surface },
  signText: {
    color: color.background,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold as "700",
  },
  ownTag: {
    minWidth: 96,
    textAlign: "center",
    color: color.textMuted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold as "700",
  },
  empty: {
    color: color.textMuted,
    fontSize: fontSize.sm,
    paddingVertical: space.sm,
  },
  error: {
    color: color.danger,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as "700",
    paddingHorizontal: space.xs,
  },
  ok: {
    color: color.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as "700",
    paddingHorizontal: space.xs,
  },
  note: { color: color.textMuted, fontSize: fontSize.xs, paddingHorizontal: space.xs },
});
