import { useCallback, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CommandTrackingStatus } from "@grinta/core";

import { Card, SectionHeader } from "@/components/card";
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
import { previewDeal } from "@/screens/market/market-model";
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

interface LedgerSummaryProjection {
  readonly clubBalances: readonly {
    readonly clubId: string;
    readonly balanceMinor: number;
  }[];
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

/** As iniciais do jogador — o domínio não tem foto, então o avatar é o nome. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

function reais(valueMinor: string | number | bigint): string {
  return `R$ ${formatAmount(Number(valueMinor) / 100)}`;
}

/** Mercado: a vitrine de jogadores do mundo, com valor estimado (R-41). */
export function Market() {
  const { session, status, client, contractVersion } = useSession();
  const worldId = useWorldId();
  const [filter, setFilter] = useState<Filter>("TODOS");
  const [signingId, setSigningId] = useState<string | null>(null);
  const [tracking, setTracking] = useState<TrackedCommandResult | null>(null);
  // O jogador que o técnico quer contratar: abre o modal de confirmação com os
  // detalhes do contrato ANTES de fechar. `null` = modal fechado.
  const [pending, setPending] = useState<MarketPlayer | null>(null);
  const clubQuery = useWorldQuery<ClubPortfolioProjection>("club-detail");
  const ledgerQuery = useWorldQuery<LedgerSummaryProjection>("ledger");
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

  const cashMinor = useMemo(() => {
    if (managedClub === null) return null;
    const found = ledgerQuery.data?.clubBalances.find(
      (b) => b.clubId === managedClub.id,
    );
    return found?.balanceMinor ?? null;
  }, [ledgerQuery.data, managedClub]);

  const refresh = useCallback(() => {
    clubQuery.refetch();
    ledgerQuery.refetch();
    marketQuery.refetch();
  }, [clubQuery.refetch, ledgerQuery.refetch, marketQuery.refetch]);

  const players = useMemo(() => {
    const all = marketQuery.data?.players ?? [];
    if (filter === "TODOS") return all;
    return all.filter((p) => SECTOR[p.primaryPosition] === filter);
  }, [marketQuery.data, filter]);

  /**
   * A compra de verdade (R-192). Oferta a 100% do valor estimado — dentro da
   * faixa da R-26 (40–250%) —, o servidor decide (não presume sucesso). Ao
   * aplicar, o elenco e o caixa mudam: refaz clube, razão e mercado. Se o
   * servidor recusar por caixa, abre o modal em vez do errinho.
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
          // Fechou: some o modal e refaz elenco, caixa e vitrine.
          setPending(null);
          clubQuery.refetch();
          ledgerQuery.refetch();
          marketQuery.refetch();
        }
        // Recusa (saldo, faixa) mantém o modal aberto com a mensagem — o técnico
        // decide o que fazer sem perder o contexto do negócio.
      });
    },
    [
      client,
      clubQuery,
      contractVersion,
      ledgerQuery,
      managedClub,
      marketQuery,
      worldId,
    ],
  );

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

  const applied =
    tracking !== null &&
    (tracking.status === CommandTrackingStatus.ACCEPTED ||
      tracking.status === CommandTrackingStatus.APPLIED);
  const deal = pending === null ? null : previewDeal(pending.valueMinor, cashMinor);

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
            {players.length} jogadores
            {cashMinor !== null ? ` · caixa ${reais(cashMinor)}` : ""}
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
              return (
                <View key={p.playerId} style={styles.row}>
                  <View style={[styles.avatar, { backgroundColor: pos.tint }]}>
                    <Text style={styles.avatarText}>{initialsOf(p.name)}</Text>
                  </View>
                  <View style={styles.info}>
                    <Text style={styles.name} numberOfLines={1}>
                      {p.name}
                    </Text>
                    <View style={styles.metaRow}>
                      <View
                        style={[styles.posBadge, { backgroundColor: pos.tint }]}
                      >
                        <Text style={styles.posText}>{pos.label}</Text>
                      </View>
                      <Text style={styles.club} numberOfLines={1}>
                        {p.clubName} · {p.age} anos · OVR {p.overall}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.action}>
                    <Text style={styles.value}>{reais(p.valueMinor)}</Text>
                    <Pressable
                      onPress={() => {
                        setTracking(null);
                        setPending(p);
                      }}
                      disabled={signingId !== null}
                      accessibilityRole="button"
                      accessibilityLabel={`Contratar ${p.name}`}
                      accessibilityState={{ disabled: signingId !== null }}
                      style={styles.signBtn}
                    >
                      <Text style={styles.signText}>CONTRATAR</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
        </Card>

        {applied && (
          <Text style={styles.ok}>Contratado. Caixa e elenco atualizados.</Text>
        )}

        <Text style={styles.note}>
          Valor estimado (R-41). A oferta sai a 100% do valor — a taxa fica na
          faixa da R-26 (40–250%). Dinheiro, contrato e elenco mudam num só ato
          (R-192).
        </Text>
      </ScrollView>

      <Modal
        visible={pending !== null}
        transparent
        animationType="fade"
        onRequestClose={() => (signingId === null ? setPending(null) : null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {pending !== null && deal !== null && (
              <>
                <Text style={styles.modalTitle}>Proposta de contratação</Text>
                <Text style={styles.modalPlayer}>
                  {pending.name} ·{" "}
                  {POSITION[pending.primaryPosition]?.label ??
                    pending.primaryPosition}{" "}
                  · OVR {pending.overall}
                </Text>

                <View style={styles.dealRows}>
                  <DealRow label="Taxa de transferência" value={reais(deal.feeMinor)} />
                  <DealRow
                    label="Duração do contrato"
                    value={`${deal.seasons} temporadas`}
                  />
                  <DealRow
                    label="Salário por temporada"
                    value={reais(deal.salaryPerSeasonMinor)}
                  />
                  <View style={styles.dealDivider} />
                  <DealRow
                    label="Seu caixa"
                    value={cashMinor !== null ? reais(cashMinor) : "—"}
                  />
                  <DealRow
                    label="Caixa após a compra"
                    value={
                      deal.cashAfterMinor !== null
                        ? reais(deal.cashAfterMinor)
                        : "—"
                    }
                    danger={!deal.affordable}
                  />
                </View>

                {!deal.affordable && (
                  <Text style={styles.error}>
                    Caixa insuficiente. Venda um jogador ou espere entrar
                    dinheiro antes de fechar.
                  </Text>
                )}
                {tracking?.status === CommandTrackingStatus.REJECTED && (
                  <Text style={styles.error}>
                    Recusada: {tracking.errorCode ?? "erro"}.
                  </Text>
                )}

                <View style={styles.modalActions}>
                  <Pressable
                    onPress={() => setPending(null)}
                    disabled={signingId !== null}
                    accessibilityRole="button"
                    accessibilityLabel="Cancelar"
                    accessibilityState={{ disabled: signingId !== null }}
                    style={styles.modalCancel}
                  >
                    <Text style={styles.modalCancelText}>CANCELAR</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => signPlayer(pending)}
                    disabled={!deal.affordable || signingId !== null}
                    accessibilityRole="button"
                    accessibilityLabel={`Confirmar contratação de ${pending.name}`}
                    accessibilityState={{
                      disabled: !deal.affordable || signingId !== null,
                    }}
                    style={[
                      styles.modalBtn,
                      (!deal.affordable || signingId !== null) &&
                        styles.modalBtnDisabled,
                    ]}
                  >
                    <Text style={styles.modalBtnText}>
                      {signingId !== null ? "..." : "CONFIRMAR"}
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/** Uma linha rótulo→valor do resumo do negócio. */
function DealRow({
  label,
  value,
  danger,
}: {
  readonly label: string;
  readonly value: string;
  readonly danger?: boolean;
}) {
  return (
    <View style={styles.dealRow}>
      <Text style={styles.dealLabel}>{label}</Text>
      <Text style={[styles.dealValue, danger === true && styles.dealValueDanger]}>
        {value}
      </Text>
    </View>
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
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#0B0B0D",
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as "700",
  },
  info: { flex: 1, gap: 3 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: space.xs },
  posBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  posText: {
    color: "#0B0B0D",
    fontSize: 10,
    fontWeight: fontWeight.bold as "700",
  },
  name: {
    color: color.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold as "700",
  },
  club: { flex: 1, color: color.textMuted, fontSize: fontSize.xs },
  action: { alignItems: "flex-end", gap: space.xs },
  value: {
    color: color.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as "700",
  },
  signBtn: {
    minWidth: 104,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
    backgroundColor: color.primary,
    alignItems: "center",
  },
  signText: {
    color: color.background,
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
  note: {
    color: color.textMuted,
    fontSize: fontSize.xs,
    paddingHorizontal: space.xs,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: space.lg,
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.md,
  },
  modalTitle: {
    color: color.text,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold as "700",
  },
  modalPlayer: {
    color: color.textMuted,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as "700",
  },
  dealRows: { gap: space.sm },
  dealRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md,
  },
  dealLabel: { color: color.textMuted, fontSize: fontSize.sm },
  dealValue: {
    color: color.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as "700",
  },
  dealValueDanger: { color: color.danger },
  dealDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: color.border,
    marginVertical: space.xs,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: space.sm,
  },
  modalCancel: {
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    backgroundColor: color.background,
  },
  modalCancelText: {
    color: color.textMuted,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as "700",
  },
  modalBtn: {
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    backgroundColor: color.primary,
  },
  modalBtnDisabled: { opacity: 0.5 },
  modalBtnText: {
    color: color.background,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as "700",
  },
});
