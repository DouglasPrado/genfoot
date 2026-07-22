import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { CommandTrackingStatus } from "@grinta/core";

import { Card } from "@/components/card";
import { Icon } from "@/components/icon";
import { Refresh } from "@/components/refresh";
import { ScreenStatePanel } from "@/components/screen-state-panel";
import {
  selectManagedClub,
  type ClubPortfolioProjection,
} from "@/lib/club-projection";
import { useToast } from "@/components/toast";
import { commandFeedback } from "@/lib/command-feedback";
import {
  submitTrackedCommand,
  type TrackedCommandResult,
} from "@/lib/command-orchestrator";
import { commandIdempotencyKey } from "@/lib/idempotency";
import { deriveScreenState } from "@/lib/screen-state";
import { useSession } from "@/lib/session";
import { useRequiredWorldId, useWorldQuery } from "@/lib/world";
import {
  deriveOnboardingStep,
  type MobileIdentityProjection,
} from "@/screens/onboarding/onboarding-model";
import {
  departmentLevelLabel,
  departmentSummary,
  injuryTypeLabel,
  rehabProgress,
  rehabStageLabel,
  restrictionLabel,
  returnEstimateLabel,
  severityLabel,
  sortCases,
  stateLabel,
  type MedicalCase,
  type MedicalDepartment,
  type MedicalRestriction,
} from "@/screens/medical/medical-model";
import { color, fontSize, fontWeight, radius, space } from "@/theme";

/**
 * `M-MEDICAL` — departamento médico do clube.
 *
 * Lista os casos ABERTOS com o que a decisão exige: em que ponto da máquina
 * cada um está, o estágio de reabilitação, o prazo e o risco de recaída. Lista
 * vazia é o estado legítimo "elenco saudável", não erro.
 */
export function Medical() {
  const { session, status, client, contractVersion } = useSession();
  const worldId = useRequiredWorldId();
  const toast = useToast();
  const [opening, setOpening] = useState<string | null>(null);
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
  const medicalQuery = useWorldQuery<MedicalDepartment>(
    managedClub === null ? null : "medical",
    managedClub === null ? undefined : { clubId: managedClub.id },
  );

  const refresh = useCallback(() => {
    clubQuery.refetch();
    medicalQuery.refetch();
  }, [clubQuery.refetch, medicalQuery.refetch]);

  /**
   * Registra o caso de quem o elenco já trata como lesionado. Sem isto a lista
   * mostra o problema e não deixa agir — o usuário vê o jogador e não tem o que
   * fazer com ele.
   */
  const openCase = useCallback(
    (playerId: string) => {
      if (client === null || contractVersion === null) return;
      setOpening(playerId);
      const idempotencyKey = commandIdempotencyKey({
        commandType: "medical:open-case",
        target: playerId,
        occasion: "abrir-caso",
      });
      void submitTrackedCommand(client, {
        clientContractVersion: "v1",
        serverContractVersion: contractVersion,
        commandType: "medical:open-case",
        worldId,
        payload: { playerId },
        idempotencyKey,
        correlationId: `mobile:${idempotencyKey}`,
      }).then((result: TrackedCommandResult) => {
        setOpening(null);
        const feedback = commandFeedback(result, "Caso médico aberto.");
        if (feedback !== null) toast.show(feedback);
        if (
          result.status === CommandTrackingStatus.ACCEPTED ||
          result.status === CommandTrackingStatus.APPLIED
        ) {
          refresh();
        }
      });
    },
    [client, contractVersion, refresh, toast, worldId],
  );

  const department = medicalQuery.data ?? null;
  const cases = sortCases(department?.cases ?? []);
  const restrictions = department?.restrictions ?? [];
  const screenState = deriveScreenState({
    session: status,
    query:
      clubQuery.state === "loading" || medicalQuery.state === "loading"
        ? "loading"
        : medicalQuery.state === "offline"
          ? "offline"
          : medicalQuery.state === "error"
            ? "error"
            : "ready",
    hasCachedData: medicalQuery.isStale,
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
        <Text style={styles.headerTitle}>DEPARTAMENTO MÉDICO</Text>
        <View style={styles.back} />
      </View>

      {screenState !== "success" || managedClub === null || department === null ? (
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
          <Card>
            <Text style={styles.summary}>{departmentSummary(department)}</Text>
            <Text style={styles.level}>
              {departmentLevelLabel(department.departmentLevel)}
            </Text>
          </Card>

          {restrictions.length === 0 ? null : (
            <Card>
              <Text style={styles.sectionTitle}>SEM CASO REGISTRADO</Text>
              <Text style={styles.note}>
                O elenco marca estes jogadores como indisponíveis, mas não há
                episódio médico para conduzir — provavelmente vieram de um mundo
                anterior ao departamento médico.
              </Text>
              {restrictions.map((item) => (
                <RestrictionRow
                  key={item.playerId}
                  item={item}
                  busy={opening === item.playerId}
                  onOpenCase={() => openCase(item.playerId)}
                />
              ))}
            </Card>
          )}

          {cases.length === 0 && restrictions.length === 0 ? (
            <Card>
              <View style={styles.emptyBox}>
                <Icon name="checkmark-circle" size={28} color={color.success} />
                <Text style={styles.emptyTitle}>Nenhum caso aberto</Text>
                <Text style={styles.emptyNote}>
                  Todo o elenco está liberado. Carga alta e jogador fatigado
                  aumentam o risco — acompanhe pelo plano de treino.
                </Text>
              </View>
            </Card>
          ) : (
            <Card>
              {cases.map((item) => (
                <CaseRow key={item.injuryId} item={item} />
              ))}
            </Card>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function RestrictionRow({
  item,
  busy,
  onOpenCase,
}: {
  readonly item: MedicalRestriction;
  readonly busy: boolean;
  readonly onOpenCase: () => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {item.playerName}
        </Text>
        <Text style={styles.detail} numberOfLines={1}>
          {item.position} · condição {item.condition}
        </Text>
        <Text style={styles.note} numberOfLines={2}>
          {restrictionLabel(item)}
        </Text>
      </View>
      <Pressable
        disabled={busy}
        onPress={onOpenCase}
        accessibilityRole="button"
        accessibilityLabel={`Abrir caso médico de ${item.playerName}`}
        accessibilityState={{ disabled: busy }}
        style={[styles.openCase, busy ? styles.openCaseBusy : null]}
      >
        <Text style={styles.openCaseText}>
          {busy ? "Abrindo…" : "Abrir caso"}
        </Text>
      </Pressable>
    </View>
  );
}

function CaseRow({ item }: { readonly item: MedicalCase }) {
  const progress = rehabProgress(item);
  const stage = rehabStageLabel(item.rehabStageCode);
  return (
    <Pressable
      onPress={() => router.push(`/elenco/medico/${item.playerId}`)}
      accessibilityRole="button"
      accessibilityLabel={`Abrir caso de ${item.playerName}`}
      accessibilityState={{}}
      style={styles.row}
    >
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {item.playerName}
        </Text>
        <Text style={styles.detail} numberOfLines={1}>
          {item.position} · {injuryTypeLabel(item.injuryType)} · {item.region}
        </Text>
        <Text style={styles.state} numberOfLines={1}>
          {stateLabel(item.state)}
          {stage === null
            ? ""
            : ` · ${stage} (${item.rehabStage}/${item.rehabStageTotal})`}
        </Text>
        {progress === null ? null : (
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${progress * 100}%` }]} />
          </View>
        )}
        <Text style={styles.estimate} numberOfLines={1}>
          {returnEstimateLabel(item)}
        </Text>
      </View>
      <View style={styles.badges}>
        <Text style={styles.severity}>{severityLabel(item.severity)}</Text>
        {item.relapseCount === 0 ? null : (
          <Text style={styles.relapse}>
            {item.relapseCount}ª recaída
          </Text>
        )}
        <Icon name="chevron-forward" size={18} color={color.textMuted} />
      </View>
    </Pressable>
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
  summary: {
    color: color.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as "700",
  },
  level: { color: color.textMuted, fontSize: fontSize.xs, marginTop: 4 },
  sectionTitle: {
    color: color.textMuted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold as "700",
    letterSpacing: 0.5,
  },
  note: { color: color.textMuted, fontSize: fontSize.xs, marginTop: 2 },
  emptyBox: { alignItems: "center", gap: space.xs, paddingVertical: space.md },
  emptyTitle: {
    color: color.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as "700",
  },
  emptyNote: {
    color: color.textMuted,
    fontSize: fontSize.xs,
    textAlign: "center",
  },
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
  detail: { color: color.textMuted, fontSize: fontSize.xs },
  state: { color: color.text, fontSize: fontSize.xs },
  estimate: { color: color.textMuted, fontSize: fontSize.xs },
  track: {
    height: 4,
    borderRadius: radius.sm,
    backgroundColor: color.border,
    overflow: "hidden",
    marginVertical: 4,
  },
  fill: { height: 4, backgroundColor: color.primary },
  badges: { alignItems: "flex-end", gap: 2 },
  severity: {
    color: color.text,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold as "700",
  },
  relapse: { color: color.danger, fontSize: fontSize.xs },
  openCase: {
    backgroundColor: color.primary,
    borderRadius: radius.sm,
    paddingVertical: space.xs,
    paddingHorizontal: space.sm,
  },
  openCaseBusy: { opacity: 0.6 },
  openCaseText: {
    color: color.primaryContrast,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold as "700",
  },
});
