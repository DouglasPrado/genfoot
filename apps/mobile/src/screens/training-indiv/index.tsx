import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import {
  CommandTrackingStatus,
  attributeLabelPt,
  projectIndividualPlan,
} from "@grinta/core";

import { Card } from "@/components/card";
import { Icon } from "@/components/icon";
import { Refresh } from "@/components/refresh";
import { ScreenStatePanel } from "@/components/screen-state-panel";
import {
  selectManagedClub,
  type ClubPortfolioProjection,
} from "@/lib/club-projection";
import { commandFeedback } from "@/lib/command-feedback";
import {
  submitTrackedCommand,
  type TrackedCommandResult,
} from "@/lib/command-orchestrator";
import { commandIdempotencyKey, onRevision } from "@/lib/idempotency";
import { deriveScreenState } from "@/lib/screen-state";
import { useSession } from "@/lib/session";
import { useToast } from "@/components/toast";
import { useRequiredWorldId, useWorldQuery } from "@/lib/world";
import {
  deriveOnboardingStep,
  type MobileIdentityProjection,
} from "@/screens/onboarding/onboarding-model";
import {
  clampIntensity,
  intensityLabel,
} from "@/screens/training-plan/training-plan-model";
import {
  POSITION_OPTIONS,
  buildSetIndividualPlanPayload,
  positionLabel,
  targetAttributeOptions,
  tradeoffHint,
  type IndividualTarget,
} from "@/screens/training-indiv/individual-training-model";
import { color, fontSize, fontWeight, radius, space } from "@/theme";

interface RosterPlayer {
  readonly playerId: string;
  readonly name: string;
  readonly primaryPosition: string;
  readonly overall: number;
  readonly availability: string;
  readonly attributes?: Record<string, number | null> | null;
}
interface RosterProjection {
  readonly players: readonly RosterPlayer[];
}
interface IndividualPlanProjection {
  readonly plan: {
    readonly target: IndividualTarget;
    readonly intensity: number;
    readonly version: number;
  } | null;
  /** Orçamento diário do jogador (0..6), para projetar o ganho. null = sumiu. */
  readonly budget: number | null;
}

/**
 * Plano INDIVIDUAL de treino (M-TRAINING-INDIV): a diretiva de desenvolvimento
 * de UM jogador rumo a um alvo — um atributo (ganho concentrado) ou a posição
 * (espalha nas recomendadas). A virada do dia aplica; aqui só escolhe e despacha.
 *
 * A leitura do plano é grossa: a query devolve o alvo/intensidade correntes,
 * usados para pré-preencher. Toda decisão vive em `individual-training-model.ts`.
 */
export function IndividualTraining({ playerId }: { readonly playerId: string }) {
  const { session, status, client, contractVersion } = useSession();
  const worldId = useRequiredWorldId();
  const toast = useToast();
  const [tracking, setTracking] = useState<TrackedCommandResult | null>(null);
  const [draftKind, setDraftKind] = useState<"ATTRIBUTE" | "POSITION" | null>(null);
  const [draftAttribute, setDraftAttribute] = useState<string | null>(null);
  const [draftPosition, setDraftPosition] = useState<string | null>(null);
  const [draftIntensity, setDraftIntensity] = useState<number | null>(null);

  const clubQuery = useWorldQuery<ClubPortfolioProjection>("club-detail");
  const identityQuery = useWorldQuery<MobileIdentityProjection>("identity-detail");
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
  // A BASE (C8) também treina individualmente: o jogador pode vir da base, e o
  // domínio aceita (squadPlayerIds inclui os dois esquadrões). Sem ler `youth`,
  // um jogador da base abria como "não encontrado".
  const youthQuery = useWorldQuery<RosterProjection>(
    managedClub === null ? null : "youth",
    managedClub === null ? undefined : { clubId: managedClub.id },
  );
  const planQuery = useWorldQuery<IndividualPlanProjection>(
    managedClub === null ? null : "individual-training-plan",
    managedClub === null ? undefined : { clubId: managedClub.id, playerId },
  );

  const player = useMemo(() => {
    const all = [
      ...(rosterQuery.data?.players ?? []),
      ...(youthQuery.data?.players ?? []),
    ];
    return all.find((p) => p.playerId === playerId) ?? null;
  }, [rosterQuery.data, youthQuery.data, playerId]);
  const plan = planQuery.data?.plan ?? null;

  // O alvo/intensidade correntes: rascunho por cima do que está valendo.
  const kind: "ATTRIBUTE" | "POSITION" =
    draftKind ?? plan?.target.kind ?? "ATTRIBUTE";
  const attributeCode =
    draftAttribute ??
    (plan?.target.kind === "ATTRIBUTE" ? plan.target.attributeCode : null);
  const position =
    draftPosition ??
    (plan?.target.kind === "POSITION" ? plan.target.position : player?.primaryPosition ?? null);
  const intensity = draftIntensity ?? plan?.intensity ?? 60;

  const target: IndividualTarget | null =
    kind === "ATTRIBUTE"
      ? attributeCode === null
        ? null
        : { kind: "ATTRIBUTE", attributeCode }
      : position === null
        ? null
        : { kind: "POSITION", position };

  const attributeOptions = useMemo(
    () => targetAttributeOptions(player?.attributes ?? {}),
    [player],
  );

  // A projeção EXATA: a MESMA função pura que a virada aplica (core), alimentada
  // pelo orçamento do servidor + os atributos do jogador. Não é estimativa.
  const budget = planQuery.data?.budget ?? null;
  const projection = useMemo(() => {
    if (target === null || budget === null || player?.attributes == null) {
      return [];
    }
    const attrs = player.attributes;
    return projectIndividualPlan({
      target,
      rawGainPoints: budget,
      attributeValueOf: (code) => attrs[code] ?? null,
    });
  }, [target, budget, player]);

  const planReadable =
    planQuery.state === "ready" || planQuery.state === "empty";
  const canSave =
    target !== null && planReadable && managedClub !== null && player !== null;

  const refresh = useCallback(() => {
    clubQuery.refetch();
    rosterQuery.refetch();
    youthQuery.refetch();
    planQuery.refetch();
  }, [clubQuery.refetch, rosterQuery.refetch, youthQuery.refetch, planQuery.refetch]);

  const save = useCallback(() => {
    if (managedClub === null || client === null || contractVersion === null) return;
    const payload = buildSetIndividualPlanPayload({
      clubId: managedClub.id,
      playerId,
      target,
      intensity,
      expectedVersion: plan?.version ?? null,
    });
    if ("error" in payload) {
      toast.show({ tone: "error", text: "Escolha um atributo ou uma posição para treinar." });
      return;
    }
    const sig =
      payload.target.kind === "ATTRIBUTE"
        ? `A:${payload.target.attributeCode}`
        : `P:${payload.target.position}`;
    const idempotencyKey = commandIdempotencyKey({
      commandType: "training:set-individual-plan",
      target: playerId,
      occasion: onRevision(plan?.version ?? 0, sig, payload.intensity),
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
      commandType: "training:set-individual-plan",
      worldId,
      payload: { ...payload },
      idempotencyKey,
      correlationId: `mobile:${idempotencyKey}`,
    }).then((result) => {
      setTracking(result);
      const fb = commandFeedback(result, "Plano individual salvo.");
      if (fb !== null) toast.show(fb);
      if (
        result.status === CommandTrackingStatus.ACCEPTED ||
        result.status === CommandTrackingStatus.APPLIED
      ) {
        setDraftKind(null);
        setDraftAttribute(null);
        setDraftPosition(null);
        setDraftIntensity(null);
        planQuery.refetch();
      }
    });
  }, [
    managedClub, client, contractVersion, worldId, playerId, target, intensity,
    plan, toast, planQuery.refetch,
  ]);

  // O jogador pode vir do elenco OU da base: o estado da tela segue quem o
  // encontra. Só é "não encontrado" quando as DUAS leituras terminaram sem ele —
  // senão a base piscava "não encontrado" enquanto `youth` ainda carregava.
  const anyLoading =
    rosterQuery.state === "loading" || youthQuery.state === "loading";
  const anyOffline =
    rosterQuery.state === "offline" || youthQuery.state === "offline";
  const screenState = deriveScreenState({
    session: status,
    hasCachedData: rosterQuery.isStale,
    query:
      player !== null
        ? "ready"
        : anyLoading
          ? "loading"
          : anyOffline
            ? "offline"
            : "empty",
  });

  if (screenState !== "success" || player === null) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <Header onBack={() => router.back()} name={player?.name ?? "Plano individual"} />
        <ScreenStatePanel
          state={screenState === "success" ? "empty" : screenState}
          title={player === null ? "JOGADOR NÃO ENCONTRADO" : undefined}
          body={
            player === null
              ? "Este jogador não está no elenco lido deste clube."
              : undefined
          }
          onRetry={refresh}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <Header onBack={() => router.back()} name={player.name} />
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<Refresh onRefresh={refresh} />}
      >
        <Card>
          <Text style={styles.cardTitle}>ALVO DO TREINO</Text>
          <Text style={styles.hint}>
            {planQuery.state === "error" || planQuery.state === "offline"
              ? "Não consegui ler o plano atual — o que aparece é rascunho."
              : plan === null
                ? `${player.name} não tem plano individual. Escolha um alvo.`
                : plan.target.kind === "ATTRIBUTE"
                  ? `Atual: atributo · intensidade ${intensityLabel(plan.intensity)}`
                  : `Atual: posição ${positionLabel(plan.target.position)} · ${intensityLabel(plan.intensity)}`}
          </Text>

          <View style={styles.kindRow}>
            {(["ATTRIBUTE", "POSITION"] as const).map((k) => (
              <Pressable
                key={k}
                onPress={() => setDraftKind(k)}
                accessibilityRole="button"
                accessibilityLabel={k === "ATTRIBUTE" ? "Alvo por atributo" : "Alvo por posição"}
                accessibilityState={{ selected: kind === k }}
                style={[styles.kindChip, kind === k && styles.kindChipActive]}
              >
                <Text style={[styles.kindText, kind === k && styles.kindTextActive]}>
                  {k === "ATTRIBUTE" ? "ATRIBUTO" : "POSIÇÃO"}
                </Text>
              </Pressable>
            ))}
          </View>

          {kind === "ATTRIBUTE" ? (
            <View style={styles.grid}>
              {attributeOptions.map((opt) => {
                const on = attributeCode === opt.attributeCode;
                return (
                  <Pressable
                    key={opt.attributeCode}
                    onPress={() => setDraftAttribute(opt.attributeCode)}
                    accessibilityRole="button"
                    accessibilityLabel={`Atributo ${opt.label}`}
                    accessibilityState={{ selected: on }}
                    style={[styles.chip, on && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextActive]}>
                      {opt.label} {opt.value}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={styles.grid}>
              {POSITION_OPTIONS.map((opt) => {
                const on = position === opt.position;
                const native = opt.position === player.primaryPosition;
                return (
                  <Pressable
                    key={opt.position}
                    onPress={() => setDraftPosition(opt.position)}
                    accessibilityRole="button"
                    accessibilityLabel={`Posição ${opt.label}`}
                    accessibilityState={{ selected: on }}
                    style={[styles.chip, on && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextActive]}>
                      {opt.label}
                      {native ? " ★" : ""}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {target !== null ? (
            <Text style={styles.tradeoff}>{tradeoffHint(target)}</Text>
          ) : null}

          {/* Projeção EXATA da PRÓXIMA virada (a mesma conta que o settle aplica). */}
          {target !== null ? (
            <View style={styles.projectionBox}>
              <Text style={styles.projectionTitle}>PROJEÇÃO — PRÓXIMA VIRADA</Text>
              {budget === null ? (
                <Text style={styles.projectionHint}>
                  Não consegui ler o orçamento do jogador; salve para aplicar mesmo assim.
                </Text>
              ) : projection.length === 0 ? (
                <Text style={styles.projectionHint}>
                  Sem ganho projetado hoje — jogador perto do potencial (ou sem folga
                  de sessão). A virada não moverá o alvo.
                </Text>
              ) : (
                projection.map((c) => (
                  <View key={c.attributeCode} style={styles.projectionRow}>
                    <Text style={styles.projAttr} numberOfLines={1}>
                      {attributeLabelPt(c.attributeCode)}
                    </Text>
                    <Text style={styles.projBefore}>{c.before}</Text>
                    <Text style={styles.projArrow}>→</Text>
                    <Text style={styles.projAfter}>{c.after}</Text>
                    <Text style={styles.projGain}>+{c.gain}</Text>
                  </View>
                ))
              )}
            </View>
          ) : null}

          <View style={styles.loadRow}>
            <Text style={styles.loadLabel}>
              INTENSIDADE · {intensityLabel(intensity)} ({intensity})
            </Text>
            <View style={styles.loadButtons}>
              <Pressable
                onPress={() => setDraftIntensity(clampIntensity(intensity - 10))}
                accessibilityRole="button"
                accessibilityLabel="Diminuir intensidade"
                accessibilityState={{}}
                style={styles.loadButton}
              >
                <Text style={styles.loadButtonText}>−</Text>
              </Pressable>
              <Pressable
                onPress={() => setDraftIntensity(clampIntensity(intensity + 10))}
                accessibilityRole="button"
                accessibilityLabel="Aumentar intensidade"
                accessibilityState={{}}
                style={styles.loadButton}
              >
                <Text style={styles.loadButtonText}>+</Text>
              </Pressable>
            </View>
          </View>

          <Text style={styles.hint}>
            Aplicado na virada do dia. Jogador lesionado/suspenso ou já em sessão
            manual é pulado — a sessão manual tem precedência.
          </Text>

          <Pressable
            onPress={save}
            disabled={!canSave}
            accessibilityRole="button"
            accessibilityLabel="Salvar plano individual"
            accessibilityState={{ disabled: !canSave }}
            style={[styles.save, !canSave && styles.saveDisabled]}
          >
            <Text style={styles.saveText}>
              {tracking?.status === CommandTrackingStatus.SUBMITTING
                ? "SALVANDO…"
                : "SALVAR PLANO INDIVIDUAL"}
            </Text>
          </Pressable>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({ onBack, name }: { readonly onBack: () => void; readonly name: string }) {
  return (
    <View style={styles.header}>
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Voltar"
        accessibilityState={{}}
        style={styles.back}
      >
        <Icon name="arrow-back" size={22} color={color.text} />
      </Pressable>
      <Text style={styles.headerTitle} numberOfLines={1}>
        {name} · treino individual
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    gap: space.sm,
  },
  back: { padding: space.xs },
  headerTitle: { flex: 1, color: color.text, fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  body: { padding: space.md, gap: space.md },
  cardTitle: {
    color: color.textMuted,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    letterSpacing: 1,
    marginBottom: space.xs,
  },
  hint: { color: color.textMuted, fontSize: fontSize.sm, marginVertical: space.xs },
  kindRow: { flexDirection: "row", gap: space.sm, marginVertical: space.sm },
  kindChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.border,
  },
  kindChipActive: { backgroundColor: color.primary, borderColor: color.primary },
  kindText: { color: color.textMuted, fontWeight: fontWeight.bold, letterSpacing: 0.5 },
  kindTextActive: { color: color.background },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.xs, marginVertical: space.xs },
  chip: {
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
    backgroundColor: color.surfaceRaised,
  },
  chipActive: { backgroundColor: color.primary },
  chipText: { color: color.text, fontSize: fontSize.sm },
  chipTextActive: { color: color.background, fontWeight: fontWeight.bold },
  tradeoff: { color: color.text, fontSize: fontSize.sm, marginTop: space.sm, fontStyle: "italic" },
  projectionBox: {
    marginTop: space.md,
    padding: space.sm,
    borderRadius: radius.md,
    backgroundColor: color.surfaceRaised,
  },
  projectionTitle: {
    color: color.textMuted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    letterSpacing: 1,
    marginBottom: space.xs,
  },
  projectionHint: { color: color.textMuted, fontSize: fontSize.sm },
  projectionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    paddingVertical: 2,
  },
  projAttr: { flex: 1, color: color.text, fontSize: fontSize.sm },
  projBefore: { color: color.textMuted, fontSize: fontSize.sm },
  projArrow: { color: color.textFaint, fontSize: fontSize.sm },
  projAfter: { color: color.text, fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  projGain: { color: color.success, fontSize: fontSize.xs, fontWeight: fontWeight.bold, marginLeft: space.xs },
  loadRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: space.md,
  },
  loadLabel: { color: color.text, fontWeight: fontWeight.bold },
  loadButtons: { flexDirection: "row", gap: space.sm },
  loadButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: color.surfaceRaised,
  },
  loadButtonText: { color: color.text, fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  save: {
    marginTop: space.md,
    alignItems: "center",
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    backgroundColor: color.primary,
  },
  saveDisabled: { opacity: 0.5 },
  saveText: { color: color.background, fontWeight: fontWeight.bold, letterSpacing: 0.5 },
});
