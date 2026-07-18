import { useCallback } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import type { ClubFinanceSnapshotView } from "@grinta/core";

import { Card, SectionHeader } from "@/components/card";
import { Icon } from "@/components/icon";
import { Refresh } from "@/components/refresh";
import { ScreenStatePanel } from "@/components/screen-state-panel";
import {
  selectManagedClub,
  type ClubPortfolioProjection,
} from "@/lib/club-projection";
import { deriveScreenState } from "@/lib/screen-state";
import { useWorldId, useWorldQuery } from "@/lib/world";
import { useSession } from "@/lib/session";
import {
  deriveOnboardingStep,
  type MobileIdentityProjection,
} from "@/screens/onboarding/onboarding-model";
import {
  deriveFinanceView,
  type HealthTone,
} from "@/screens/finance/finance-model";
import { color, space, radius, fontSize, fontWeight } from "@/theme";

const HEALTH_COLORS: Record<HealthTone, string> = {
  excellent: color.success,
  stable: color.success,
  attention: color.warning,
  pressure: color.warning,
  crisis: color.danger,
  collapse: color.danger,
  unavailable: color.textMuted,
};

/** M-FINANCE — a tela de Finanças (custos da temporada, caixa, saúde). */
export function Finance() {
  const worldId = useWorldId();
  const { session, status } = useSession();
  const worldQuery = useWorldQuery<{ currentDate: string }>("world");
  const clubQuery = useWorldQuery<ClubPortfolioProjection>("club-detail");
  const identityQuery =
    useWorldQuery<MobileIdentityProjection>("identity-detail");
  const controlStep = deriveOnboardingStep(
    identityQuery.state === "ready" ? identityQuery.data : null,
    session?.accountId ?? null,
    worldQuery.data?.currentDate ?? "",
  );
  const managedClub = selectManagedClub(
    clubQuery.data,
    controlStep.kind === "complete" ? controlStep.clubId : null,
  );
  const financeQuery = useWorldQuery<ClubFinanceSnapshotView>(
    managedClub === null ? null : "finance-snapshot",
    managedClub === null ? undefined : { clubId: managedClub.id },
  );
  const view = deriveFinanceView(
    financeQuery.state === "ready" ? financeQuery.data : null,
  );

  const refresh = useCallback(() => {
    clubQuery.refetch();
    identityQuery.refetch();
    financeQuery.refetch();
  }, [clubQuery.refetch, identityQuery.refetch, financeQuery.refetch]);

  const screenState = deriveScreenState({
    session: status,
    hasCachedData: financeQuery.isStale,
    query:
      managedClub === null || financeQuery.state === "loading"
        ? "loading"
        : financeQuery.state === "offline"
          ? "offline"
          : financeQuery.state === "error"
            ? "error"
            : financeQuery.state === "empty" || view === null
              ? "empty"
              : "ready",
  });

  if (screenState !== "success" || view === null) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <Header />
        <View style={styles.content}>
          <ScreenStatePanel
            state={screenState === "success" ? "empty" : screenState}
            title={managedClub === null ? "CLUBE NÃO DISPONÍVEL" : undefined}
            body={
              managedClub === null
                ? "Assuma um clube para ver as finanças."
                : "O financeiro ainda não existe neste mundo."
            }
            onRetry={refresh}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Header />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<Refresh onRefresh={refresh} />}
      >
        {/* Caixa */}
        <Card>
          <SectionHeader
            title="CAIXA DISPONÍVEL"
            trailing={<Icon name="wallet" size={16} color={color.textMuted} />}
          />
          <Text
            style={[
              styles.cashValue,
              view.cashNegative ? styles.cashNegative : null,
            ]}
          >
            {view.cashLabel}
          </Text>
          {view.cashNegative ? (
            <Text style={styles.crisisNote}>
              Caixa negativo — o clube está em crise (sem receita, os custos
              drenam o saldo a cada temporada).
            </Text>
          ) : null}
        </Card>

        {/* Custos da temporada */}
        <Card>
          <SectionHeader
            title="CUSTOS DA TEMPORADA"
            trailing={
              <Icon name="trending-down" size={16} color={color.textMuted} />
            }
          />
          {view.costLines.map((line, index) => (
            <View key={`${line.label}-${index}`} style={styles.costRow}>
              <View style={styles.costLabelWrap}>
                <Text style={styles.costLabel}>{line.label}</Text>
                {line.provenanceLabel ? (
                  <Text
                    style={[
                      styles.tag,
                      line.provenanceLabel === "estimado"
                        ? styles.tagEstimated
                        : styles.tagContracted,
                    ]}
                  >
                    {line.provenanceLabel}
                  </Text>
                ) : null}
              </View>
              <Text style={styles.costValue}>{line.amountLabel}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>TOTAL / TEMPORADA</Text>
            <Text style={styles.totalValue}>{view.seasonTotalLabel}</Text>
          </View>
          <Text style={styles.countsNote}>
            Folha: {view.contractedCount} contratado(s), {view.estimatedCount}{" "}
            estimado(s).
          </Text>
          {view.omittedLabels.length > 0 ? (
            <Text style={styles.omittedNote}>
              Não contabilizado (sem fonte real): {view.omittedLabels.join(", ")}.
            </Text>
          ) : null}
        </Card>

        {/* Saúde financeira */}
        <Card>
          <SectionHeader
            title="SAÚDE FINANCEIRA"
            trailing={<Icon name="pulse" size={16} color={color.textMuted} />}
          />
          <View style={styles.healthRow}>
            <View
              style={[
                styles.healthBadge,
                { borderColor: HEALTH_COLORS[view.health.tone] },
              ]}
            >
              <Text
                style={[
                  styles.healthLabel,
                  { color: HEALTH_COLORS[view.health.tone] },
                ]}
              >
                {view.health.label}
              </Text>
            </View>
            {view.health.value !== null ? (
              <Text style={styles.healthValue}>{view.health.value}/100</Text>
            ) : (
              <Text style={styles.healthUnavailable}>
                falta receita/dívida para o índice fechar
              </Text>
            )}
          </View>
        </Card>

        {/* Procedência */}
        {view.provenanceNotes.length > 0 ? (
          <Card>
            <SectionHeader
              title="COMO ESTES NÚMEROS SÃO APURADOS"
              trailing={
                <Icon name="document-text" size={16} color={color.textMuted} />
              }
            />
            {view.provenanceNotes.map((note, index) => (
              <Text key={index} style={styles.provenanceNote}>
                • {note}
              </Text>
            ))}
          </Card>
        ) : null}

        {/* Cartões parciais (doc da tela, sem domínio ainda) */}
        <Card>
          <SectionHeader
            title="AINDA NÃO DISPONÍVEL"
            trailing={
              <Icon name="construct" size={16} color={color.textMuted} />
            }
          />
          {view.partialCards.map((partial) => (
            <View key={partial.title} style={styles.partialRow}>
              <Text style={styles.partialTitle}>{partial.title}</Text>
              <Text style={styles.partialMissing}>{partial.missing}</Text>
            </View>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function Header() {
  return (
    <View style={styles.header}>
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Voltar"
        style={styles.back}
      >
        <Icon name="arrow-back" size={22} color={color.text} />
      </Pressable>
      <Text style={styles.headerTitle}>FINANÇAS</Text>
      <View style={styles.back} />
    </View>
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
  back: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  headerTitle: {
    color: color.text,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
    letterSpacing: 0.5,
  },
  content: { padding: space.lg, gap: space.lg, paddingBottom: space.xl4 },
  cashValue: {
    color: color.primary,
    fontSize: fontSize.xl2,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
    marginTop: space.sm,
  },
  cashNegative: { color: color.danger },
  crisisNote: {
    color: color.danger,
    fontSize: fontSize.xs,
    marginTop: space.sm,
    lineHeight: 17,
  },
  costRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: space.sm,
  },
  costLabelWrap: { flexDirection: "row", alignItems: "center", gap: space.sm, flex: 1 },
  costLabel: { color: color.text, fontSize: fontSize.sm },
  tag: {
    fontSize: 9,
    fontWeight: fontWeight.bold as "700",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    overflow: "hidden",
    textTransform: "uppercase",
  },
  tagEstimated: { color: color.warning, backgroundColor: "#31281199" },
  tagContracted: { color: color.info, backgroundColor: "#1a254099" },
  costValue: {
    color: color.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as "700",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: space.md,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: color.surfaceRaised,
  },
  totalLabel: {
    color: color.textMuted,
    fontSize: 10,
    fontWeight: fontWeight.bold as "700",
    letterSpacing: 0.5,
  },
  totalValue: {
    color: color.text,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
  },
  countsNote: {
    color: color.textMuted,
    fontSize: 11,
    marginTop: space.sm,
  },
  omittedNote: {
    color: color.textMuted,
    fontSize: 11,
    marginTop: 4,
    lineHeight: 16,
  },
  healthRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    marginTop: space.sm,
  },
  healthBadge: {
    borderWidth: 1.5,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 5,
  },
  healthLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
  },
  healthValue: {
    color: color.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as "700",
  },
  healthUnavailable: { color: color.textMuted, fontSize: fontSize.xs, flex: 1 },
  provenanceNote: {
    color: color.textMuted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
  },
  partialRow: { marginTop: space.sm },
  partialTitle: {
    color: color.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as "700",
  },
  partialMissing: { color: color.textMuted, fontSize: 11, marginTop: 1 },
});
