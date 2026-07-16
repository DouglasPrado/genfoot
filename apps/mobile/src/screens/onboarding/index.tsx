import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { CommandTrackingStatus } from "@grinta/core";

import { Icon } from "@/components/icon";
import { type ClubPortfolioProjection } from "@/lib/club-projection";
import {
  submitTrackedCommand,
  type TrackedCommandResult,
} from "@/lib/command-orchestrator";
import { useSession } from "@/lib/session";
import { useWorldId, useWorldQuery } from "@/lib/world";
import { color, fontSize, fontWeight, radius, space } from "@/theme";
import {
  addWorldDays,
  deriveOnboardingStep,
  mobileAccountKey,
  projectionAdvancedPast,
  type MobileIdentityProjection,
  type OnboardingStep,
} from "./onboarding-model";

interface WorldProjection {
  readonly currentDate: string;
}

const COPY = {
  initialize: [
    "PREPARAR PERFIL",
    "Ative o contexto de identidade deste mundo para começar.",
  ],
  "register-account": [
    "CRIAR PERFIL DE GESTOR",
    "Crie sua identidade oficial dentro deste mundo.",
  ],
  "join-world": [
    "ENTRAR NO MUNDO",
    "Registre sua participação antes de escolher um clube.",
  ],
  cooldown: [
    "TROCA EM ESPERA",
    "O período de espera protege a continuidade do clube. Avance a data do mundo antes de escolher outro.",
  ],
  "choose-club": [
    "ESCOLHER CLUBE",
    "Selecione o clube que deseja administrar.",
  ],
  "confirm-control": [
    "CONFIRMAR CONTROLE",
    "Revise a reserva e assuma oficialmente o clube.",
  ],
  complete: [
    "CLUBE ATIVADO",
    "Seu controle foi confirmado pela projeção oficial.",
  ],
} as const;
const STEP_ORDER = [
  "initialize",
  "register-account",
  "join-world",
  "cooldown",
  "choose-club",
  "confirm-control",
  "complete",
] as const;

/** GP-001: entrada real no mundo e ativação do controle de clube. */
export function Onboarding() {
  const worldId = useWorldId();
  const { client, session, status, contractVersion } = useSession();
  const worldQuery = useWorldQuery<WorldProjection>("world");
  const identityQuery =
    useWorldQuery<MobileIdentityProjection>("identity-detail");
  const clubQuery = useWorldQuery<ClubPortfolioProjection>("club");
  const subject = session?.subject ?? "";
  const identity = identityQuery.state === "empty" ? null : identityQuery.data;
  const step = deriveOnboardingStep(
    identity,
    subject,
    worldQuery.data?.currentDate ?? "",
  );
  const clubs =
    clubQuery.data?.clubs.filter((club) => club.status === "ACTIVE") ?? [];
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
  const selectedClub = useMemo(
    () => clubs.find((club) => club.id === selectedClubId) ?? clubs[0] ?? null,
    [clubs, selectedClubId],
  );
  const [tracking, setTracking] = useState<TrackedCommandResult | null>(null);
  const [submittedStep, setSubmittedStep] = useState<
    OnboardingStep["kind"] | null
  >(null);
  const busy =
    tracking?.status === CommandTrackingStatus.SUBMITTING ||
    tracking?.status === CommandTrackingStatus.ACCEPTED ||
    tracking?.status === CommandTrackingStatus.UNKNOWN_RECOVERING;

  const refresh = useCallback(() => {
    worldQuery.refetch();
    identityQuery.refetch();
    clubQuery.refetch();
  }, [clubQuery.refetch, identityQuery.refetch, worldQuery.refetch]);

  const execute = useCallback(
    async (
      commandType: string,
      payload: Record<string, unknown>,
      idempotencyKey: string,
    ) => {
      if (client === null || contractVersion === null) return;
      const correlationId = `mobile:${idempotencyKey}`;
      setSubmittedStep(step.kind);
      setTracking({
        status: CommandTrackingStatus.SUBMITTING,
        commandId: null,
        resource: null,
        correlationId,
        errorCode: null,
      });
      const result = await submitTrackedCommand(client, {
        clientContractVersion: "v1",
        serverContractVersion: contractVersion,
        commandType,
        worldId,
        payload,
        idempotencyKey,
        correlationId,
      });
      setTracking(result);
      if (
        result.status === CommandTrackingStatus.ACCEPTED ||
        result.status === CommandTrackingStatus.APPLIED
      )
        identityQuery.refetch();
    },
    [client, contractVersion, identityQuery.refetch, step.kind, worldId],
  );

  useEffect(() => {
    if (
      tracking !== null &&
      (tracking.status === CommandTrackingStatus.ACCEPTED ||
        tracking.status === CommandTrackingStatus.APPLIED) &&
      projectionAdvancedPast(submittedStep, step.kind)
    ) {
      setTracking(null);
      setSubmittedStep(null);
    }
  }, [step.kind, submittedStep, tracking]);

  const act = useCallback(() => {
    const worldDate = worldQuery.data?.currentDate ?? "2026-01-01";
    if (step.kind === "initialize")
      return void execute(
        "identity:initialize",
        {},
        `identity-init:${worldId}`,
      );
    if (step.kind === "register-account")
      return void execute(
        "identity:register-account",
        { locale: "pt-BR" },
        mobileAccountKey(subject),
      );
    if (step.kind === "join-world")
      return void execute(
        "identity:join-world",
        { accountId: step.accountId, gameWorldId: worldId },
        `join:${step.accountId}:${worldId}`,
      );
    if (step.kind === "cooldown") {
      refresh();
      return;
    }
    if (step.kind === "choose-club" && selectedClub !== null) {
      const expiresOn = addWorldDays(worldDate, 7);
      Alert.alert(
        "Reservar clube?",
        `${selectedClub.identity.name} ficará reservado até ${expiresOn}.`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Reservar",
            onPress: () =>
              void execute(
                step.switchMode
                  ? "identity:request-switch"
                  : "identity:reserve-club",
                {
                  accountId: step.accountId,
                  ...(step.switchMode
                    ? { targetClubId: selectedClub.id }
                    : { clubId: selectedClub.id }),
                  expiresOn,
                },
                `${step.switchMode ? "switch" : "reserve"}:${step.accountId}:${selectedClub.id}`,
              ),
          },
        ],
      );
      return;
    }
    if (step.kind === "confirm-control") {
      Alert.alert(
        "Assumir o clube?",
        "Isto ativa seu controle oficial. Sair ou trocar depois aplica período de espera.",
        [
          { text: "Revisar", style: "cancel" },
          {
            text: "Assumir clube",
            onPress: () =>
              void execute(
                "identity:confirm-onboarding",
                { reservationId: step.reservationId },
                `confirm:${step.reservationId}`,
              ),
          },
        ],
      );
      return;
    }
    if (step.kind === "complete") router.replace("/");
  }, [
    execute,
    refresh,
    selectedClub,
    step,
    subject,
    worldId,
    worldQuery.data?.currentDate,
  ]);

  const [title, body] = COPY[step.kind];
  const loading =
    status === "connecting" ||
    worldQuery.state === "loading" ||
    clubQuery.state === "loading" ||
    identityQuery.state === "loading";
  const technicalError =
    worldQuery.state === "error" ||
    clubQuery.state === "error" ||
    identityQuery.state === "error";
  const stepIndex = STEP_ORDER.indexOf(step.kind);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.brand}>
          <View style={styles.brandIcon}>
            <Icon name="shield" size={28} color={color.primary} />
          </View>
          <View>
            <Text style={styles.eyebrow}>GRINTA · NOVO CONTROLE</Text>
            <Text style={styles.heading}>COMANDE UM CLUBE</Text>
          </View>
        </View>
        <View
          style={styles.progress}
          accessibilityLabel={`Etapa ${Math.min(5, stepIndex + 1)} de 5`}
        >
          {Array.from({ length: 5 }).map((_, index) => (
            <View
              key={index}
              style={[
                styles.progressBar,
                index <= stepIndex ? styles.progressActive : null,
              ]}
            />
          ))}
        </View>
        <View style={styles.card}>
          {loading ? (
            <ActivityIndicator color={color.primary} size="large" />
          ) : null}
          {!loading ? (
            <Text style={styles.title}>
              {technicalError ? "NÃO FOI POSSÍVEL CONTINUAR" : title}
            </Text>
          ) : null}
          {!loading ? (
            <Text style={styles.body}>
              {technicalError
                ? "A projeção oficial não respondeu. Seu progresso não foi alterado."
                : body}
            </Text>
          ) : null}
          {!loading && !technicalError && step.kind === "choose-club" ? (
            <View style={styles.clubList}>
              {clubs.map((club) => {
                const selected = club.id === selectedClub?.id;
                return (
                  <Pressable
                    key={club.id}
                    style={[
                      styles.clubRow,
                      selected ? styles.clubSelected : null,
                    ]}
                    onPress={() => setSelectedClubId(club.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`Selecionar ${club.identity.name}`}
                  >
                    <View style={styles.clubCrest}>
                      <Text style={styles.clubInitial}>
                        {club.identity.shortCode}
                      </Text>
                    </View>
                    <View style={styles.clubInfo}>
                      <Text style={styles.clubName}>{club.identity.name}</Text>
                      <Text style={styles.clubMeta}>
                        {club.stadium.name} ·{" "}
                        {club.stadium.capacity.toLocaleString("pt-BR")} lugares
                      </Text>
                    </View>
                    {selected ? (
                      <Icon
                        name="checkmark-circle"
                        size={20}
                        color={color.primary}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          ) : null}
          {tracking?.status === CommandTrackingStatus.REJECTED ? (
            <View style={styles.errorBox}>
              <Icon name="warning" size={17} color={color.danger} />
              <Text style={styles.errorText}>
                {tracking.errorCode ?? "COMMAND_REJECTED"}
              </Text>
            </View>
          ) : null}
          {!loading ? (
            <Pressable
              style={[styles.cta, busy ? styles.ctaDisabled : null]}
              onPress={technicalError ? refresh : act}
              disabled={
                busy || (step.kind === "choose-club" && selectedClub === null)
              }
              accessibilityRole="button"
              accessibilityLabel={technicalError ? "Tentar novamente" : title}
            >
              {busy ? (
                <ActivityIndicator color={color.primaryContrast} />
              ) : null}
              <Text style={styles.ctaText}>
                {technicalError
                  ? "TENTAR NOVAMENTE"
                  : step.kind === "complete"
                    ? "IR PARA A CENTRAL"
                    : title}
              </Text>
              {!busy ? (
                <Icon
                  name="chevron-forward"
                  size={17}
                  color={color.primaryContrast}
                />
              ) : null}
            </Pressable>
          ) : null}
        </View>
        <Text style={styles.footnote}>
          Cada etapa só avança depois que o backend confirma o efeito na
          projeção oficial.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.background },
  content: { padding: space.lg, gap: space.lg, paddingBottom: space.xl2 },
  brand: { flexDirection: "row", alignItems: "center", gap: space.md },
  brandIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: color.primary,
    backgroundColor: color.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  eyebrow: {
    color: color.primary,
    fontSize: 10,
    fontWeight: fontWeight.bold as "700",
    letterSpacing: 1,
  },
  heading: {
    color: color.text,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
  },
  progress: { flexDirection: "row", gap: space.xs },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: color.surfaceRaised,
  },
  progressActive: { backgroundColor: color.primary },
  card: {
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.borderStrong,
    borderRadius: radius.lg,
    padding: space.xl,
    gap: space.md,
  },
  title: {
    color: color.text,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
  },
  body: { color: color.textMuted, fontSize: fontSize.sm, lineHeight: 20 },
  clubList: { gap: space.sm },
  clubRow: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.md,
    padding: space.sm,
    backgroundColor: color.backgroundElevated,
  },
  clubSelected: { borderColor: color.primary, backgroundColor: "#151c0e" },
  clubCrest: {
    width: 42,
    height: 46,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: color.primaryDim,
    alignItems: "center",
    justifyContent: "center",
  },
  clubInitial: {
    color: color.primary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
  },
  clubInfo: { flex: 1 },
  clubName: {
    color: color.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as "700",
  },
  clubMeta: { color: color.textMuted, fontSize: 9, marginTop: 2 },
  cta: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
    borderRadius: radius.sm,
    backgroundColor: color.primary,
    paddingHorizontal: space.md,
  },
  ctaDisabled: { opacity: 0.55 },
  ctaText: {
    color: color.primaryContrast,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    padding: space.sm,
    borderRadius: radius.sm,
    backgroundColor: color.backgroundElevated,
  },
  errorText: { color: color.danger, fontSize: fontSize.xs, flex: 1 },
  footnote: {
    color: color.textFaint,
    fontSize: fontSize.xs,
    lineHeight: 17,
    textAlign: "center",
  },
});
