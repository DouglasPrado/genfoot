import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { CommandTrackingStatus } from "@grinta/core";

import { Card } from "@/components/card";
import { Icon } from "@/components/icon";
import { Refresh } from "@/components/refresh";
import { ScreenStatePanel } from "@/components/screen-state-panel";
import { useToast } from "@/components/toast";
import { commandFeedback } from "@/lib/command-feedback";
import {
  submitTrackedCommand,
  type TrackedCommandResult,
} from "@/lib/command-orchestrator";
import { commandIdempotencyKey, onRevision } from "@/lib/idempotency";
import { deriveScreenState } from "@/lib/screen-state";
import { useSession } from "@/lib/session";
import { useRequiredWorldId, useWorldQuery } from "@/lib/world";
import {
  canForceReturn,
  forceReturnWarning,
  formatWorldDate,
  injuryTypeLabel,
  primaryAction,
  rehabProgress,
  rehabStageLabel,
  returnEstimateLabel,
  severityLabel,
  stateLabel,
  treatmentLabel,
  type MedicalCase,
} from "@/screens/medical/medical-model";
import { color, fontSize, fontWeight, radius, space } from "@/theme";

interface TreatmentProfileView {
  readonly option: string;
  readonly durationMultiplier: number;
  readonly relapseRiskDelta: number;
  readonly dailyCostMinor: number;
}

interface MedicalCaseProjection {
  readonly case: MedicalCase | null;
  readonly treatmentOptions: readonly TreatmentProfileView[];
  readonly disclosureLayer: string;
}

/**
 * `M-MEDICAL-CASE` — conduz UM tratamento.
 *
 * A tela só oferece a transição que a máquina aceita no estado corrente
 * (`primaryAction`), e o retorno antecipado passa por confirmação explícita:
 * o risco de recaída é real e a recaída pode agravar a lesão.
 */
export function MedicalCaseScreen({ playerId }: { readonly playerId: string }) {
  const { client, contractVersion, status } = useSession();
  const worldId = useRequiredWorldId();
  const toast = useToast();
  const caseQuery = useWorldQuery<MedicalCaseProjection>("medical-case", {
    playerId,
  });
  const [tracking, setTracking] = useState<TrackedCommandResult | null>(null);
  const [confirmingReturn, setConfirmingReturn] = useState(false);

  const refresh = useCallback(() => {
    caseQuery.refetch();
  }, [caseQuery.refetch]);

  const medicalCase = caseQuery.data?.case ?? null;
  const options = caseQuery.data?.treatmentOptions ?? [];
  const busy = tracking?.status === CommandTrackingStatus.SUBMITTING;

  const send = useCallback(
    (commandType: string, payload: Record<string, unknown>, okText: string) => {
      if (client === null || contractVersion === null || medicalCase === null) {
        return;
      }
      const idempotencyKey = commandIdempotencyKey({
        commandType,
        target: playerId,
        // A ocasião é o estado do episódio: repetir o mesmo comando no mesmo
        // estado é a MESMA intenção; avançar o estado é outra.
        occasion: onRevision(
          medicalCase.rehabStage ?? 0,
          medicalCase.state,
          JSON.stringify(payload),
        ),
      });
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
        commandType,
        worldId,
        payload: { playerId, ...payload },
        idempotencyKey,
        correlationId: `mobile:${idempotencyKey}`,
      }).then((result) => {
        setTracking(result);
        const feedback = commandFeedback(result, okText);
        if (feedback !== null) toast.show(feedback);
        if (
          result.status === CommandTrackingStatus.ACCEPTED ||
          result.status === CommandTrackingStatus.APPLIED
        ) {
          setConfirmingReturn(false);
          refresh();
        }
      });
    },
    [
      client,
      contractVersion,
      medicalCase,
      playerId,
      refresh,
      toast,
      worldId,
    ],
  );

  const screenState = deriveScreenState({
    session: status,
    query:
      caseQuery.state === "loading"
        ? "loading"
        : caseQuery.state === "offline"
          ? "offline"
          : caseQuery.state === "error"
            ? "error"
            : "ready",
    hasCachedData: caseQuery.isStale,
  });

  const action = medicalCase === null ? null : primaryAction(medicalCase);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Voltar ao departamento médico"
          accessibilityState={{}}
          hitSlop={8}
          style={styles.back}
        >
          <Icon name="arrow-back" size={22} color={color.text} />
        </Pressable>
        <Text style={styles.headerTitle}>CASO MÉDICO</Text>
        <View style={styles.back} />
      </View>

      {screenState !== "success" ? (
        <View style={styles.content}>
          <ScreenStatePanel state={screenState} onRetry={refresh} />
        </View>
      ) : medicalCase === null ? (
        <View style={styles.content}>
          <Card>
            <Text style={styles.emptyTitle}>Sem caso aberto</Text>
            <Text style={styles.note}>
              Este jogador não tem episódio médico em andamento.
            </Text>
          </Card>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<Refresh onRefresh={refresh} />}
        >
          <Card>
            <Text style={styles.name}>{medicalCase.playerName}</Text>
            <Text style={styles.note}>
              {injuryTypeLabel(medicalCase.injuryType)} · {medicalCase.region} ·
              gravidade {severityLabel(medicalCase.severity)}
            </Text>
            <Text style={styles.note}>
              Início em {formatWorldDate(medicalCase.occurredOn)}
            </Text>
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>Diagnóstico</Text>
            <Text style={styles.state}>{stateLabel(medicalCase.state)}</Text>
            <Text style={styles.note}>{returnEstimateLabel(medicalCase)}</Text>
            {medicalCase.returnRiskScore === null ? null : (
              <Text style={styles.note}>
                Risco de retorno: {medicalCase.returnRiskScore}/100
              </Text>
            )}
            {medicalCase.relapseCount === 0 ? null : (
              <Text style={styles.danger}>
                {medicalCase.relapseCount}{" "}
                {medicalCase.relapseCount === 1 ? "recaída" : "recaídas"} neste
                episódio
              </Text>
            )}
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>Reabilitação</Text>
            <RehabLadder medicalCase={medicalCase} />
          </Card>

          {medicalCase.state === "DIAGNOSIS" && options.length > 0 ? (
            <Card>
              <Text style={styles.sectionTitle}>Tratamento</Text>
              <Text style={styles.note}>
                Prazo, custo e risco mudam com a escolha.
              </Text>
              {options.map((option) => (
                <Pressable
                  key={option.option}
                  disabled={busy}
                  onPress={() =>
                    send(
                      "medical:set-plan",
                      { option: option.option },
                      "Tratamento definido. Reabilitação iniciada.",
                    )
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`Escolher tratamento ${treatmentLabel(option.option) ?? option.option}`}
                  accessibilityState={{ disabled: busy }}
                  style={styles.option}
                >
                  <View style={styles.optionInfo}>
                    <Text style={styles.optionName}>
                      {treatmentLabel(option.option) ?? option.option}
                    </Text>
                    <Text style={styles.note}>
                      Prazo ×{option.durationMultiplier.toFixed(2)} · recaída{" "}
                      {option.relapseRiskDelta >= 0 ? "+" : ""}
                      {option.relapseRiskDelta} pts
                    </Text>
                  </View>
                  <Icon name="chevron-forward" size={18} color={color.textMuted} />
                </Pressable>
              ))}
            </Card>
          ) : null}

          {medicalCase.treatmentOption === null ? null : (
            <Card>
              <Text style={styles.sectionTitle}>Plano em curso</Text>
              <Text style={styles.state}>
                {treatmentLabel(medicalCase.treatmentOption)}
              </Text>
            </Card>
          )}

          {action === null || action.kind === "NONE" ? null : (
            <Pressable
              disabled={busy}
              onPress={() => {
                if (action.kind === "ORDER_EXAM") {
                  send("medical:order-exam", {}, "Exames solicitados.");
                } else if (action.kind === "DIAGNOSE") {
                  // O resultado do exame é do servidor; a tela só pede que ele
                  // seja fechado com a suspeita corrente e o risco medido.
                  send(
                    "medical:diagnose",
                    {
                      severity: medicalCase.severity ?? "MODERATE",
                      returnRiskScore: medicalCase.returnRiskScore ?? 50,
                    },
                    "Diagnóstico registrado.",
                  );
                } else if (action.kind === "ADVANCE_REHAB") {
                  send("medical:advance-rehab", {}, "Estágio avançado.");
                } else if (action.kind === "DISCHARGE") {
                  send("medical:discharge", {}, "Alta concedida.");
                }
              }}
              accessibilityRole="button"
              accessibilityLabel={action.label}
              accessibilityState={{ disabled: busy }}
              style={[styles.primary, busy ? styles.primaryBusy : null]}
            >
              <Text style={styles.primaryText}>
                {busy ? "Enviando…" : action.label}
              </Text>
            </Pressable>
          )}

          {canForceReturn(medicalCase) ? (
            <Card>
              <Text style={styles.sectionTitle}>Retorno antecipado</Text>
              {confirmingReturn ? (
                <ConfirmReturn
                  medicalCase={medicalCase}
                  busy={busy}
                  onCancel={() => setConfirmingReturn(false)}
                  onConfirm={() =>
                    send(
                      "medical:force-return",
                      { acceptRisk: true },
                      "Retorno antecipado registrado.",
                    )
                  }
                />
              ) : (
                <Pressable
                  onPress={() => setConfirmingReturn(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Antecipar retorno assumindo o risco"
                  accessibilityState={{}}
                  style={styles.secondary}
                >
                  <Text style={styles.secondaryText}>
                    Antecipar retorno (assumir risco)
                  </Text>
                </Pressable>
              )}
            </Card>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

/** Os 7 estágios, com o corrente marcado — a ordem é obrigatória. */
function RehabLadder({ medicalCase }: { readonly medicalCase: MedicalCase }) {
  const progress = rehabProgress(medicalCase);
  const current = medicalCase.rehabStage;
  const stages = [
    "PAIN_CONTROL",
    "MOVEMENT_RECOVERY",
    "STRENGTHENING",
    "INDIVIDUAL_TRAINING",
    "PARTIAL_TRAINING",
    "FULL_TRAINING",
    "COMPETITIVE_CLEARANCE",
  ];
  return (
    <View style={styles.ladder}>
      {progress === null ? (
        <Text style={styles.note}>
          A reabilitação começa quando o tratamento for definido.
        </Text>
      ) : (
        stages.map((code, index) => {
          const stageNumber = index + 1;
          const done = current !== null && stageNumber < current;
          const isCurrent = current === stageNumber;
          return (
            <View key={code} style={styles.stageRow}>
              <View
                style={[
                  styles.dot,
                  done ? styles.dotDone : null,
                  isCurrent ? styles.dotCurrent : null,
                ]}
              />
              <Text
                style={[styles.stageText, isCurrent ? styles.stageCurrent : null]}
              >
                {stageNumber}. {rehabStageLabel(code)}
              </Text>
            </View>
          );
        })
      )}
    </View>
  );
}

function ConfirmReturn({
  medicalCase,
  busy,
  onCancel,
  onConfirm,
}: {
  readonly medicalCase: MedicalCase;
  readonly busy: boolean;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}) {
  const warning = forceReturnWarning(medicalCase);
  return (
    <View style={styles.confirm}>
      <Text
        style={[
          styles.confirmTitle,
          warning.tone === "danger" ? styles.danger : null,
        ]}
      >
        {warning.title}
      </Text>
      <Text style={styles.note}>{warning.message}</Text>
      <View style={styles.confirmActions}>
        <Pressable
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel="Cancelar retorno antecipado"
          accessibilityState={{}}
          style={styles.secondary}
        >
          <Text style={styles.secondaryText}>Cancelar</Text>
        </Pressable>
        <Pressable
          disabled={busy}
          onPress={onConfirm}
          accessibilityRole="button"
          accessibilityLabel="Confirmar retorno antecipado assumindo o risco"
          accessibilityState={{ disabled: busy }}
          style={[styles.dangerButton, busy ? styles.primaryBusy : null]}
        >
          <Text style={styles.dangerButtonText}>
            {busy ? "Enviando…" : "Assumir o risco"}
          </Text>
        </Pressable>
      </View>
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
  back: { width: 32, alignItems: "flex-start" },
  headerTitle: {
    color: color.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold as "700",
    letterSpacing: 0.5,
  },
  content: { padding: space.lg, gap: space.md },
  name: {
    color: color.text,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold as "700",
  },
  sectionTitle: {
    color: color.textMuted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold as "700",
    letterSpacing: 0.5,
    marginBottom: space.xs,
  },
  state: {
    color: color.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as "700",
  },
  note: { color: color.textMuted, fontSize: fontSize.xs, marginTop: 2 },
  danger: { color: color.danger },
  emptyTitle: {
    color: color.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as "700",
  },
  ladder: { gap: space.xs },
  stageRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: color.border,
  },
  dotDone: { backgroundColor: color.success },
  dotCurrent: { backgroundColor: color.primary },
  stageText: { color: color.textMuted, fontSize: fontSize.xs },
  stageCurrent: {
    color: color.text,
    fontWeight: fontWeight.bold as "700",
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingVertical: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.border,
  },
  optionInfo: { flex: 1 },
  optionName: {
    color: color.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as "700",
  },
  primary: {
    backgroundColor: color.primary,
    borderRadius: radius.md,
    paddingVertical: space.md,
    alignItems: "center",
  },
  primaryBusy: { opacity: 0.6 },
  primaryText: {
    color: color.primaryContrast,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as "700",
  },
  secondary: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.borderStrong,
    borderRadius: radius.md,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    alignItems: "center",
  },
  secondaryText: { color: color.text, fontSize: fontSize.xs },
  confirm: { gap: space.sm },
  confirmTitle: {
    color: color.warning,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as "700",
  },
  confirmActions: { flexDirection: "row", gap: space.sm },
  dangerButton: {
    flex: 1,
    backgroundColor: color.danger,
    borderRadius: radius.md,
    paddingVertical: space.sm,
    alignItems: "center",
  },
  dangerButtonText: {
    color: color.text,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold as "700",
  },
});
