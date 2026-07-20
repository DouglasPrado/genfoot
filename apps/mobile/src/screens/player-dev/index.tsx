import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { CommandTrackingStatus, type PlayerDevelopmentView } from "@grinta/core";

import { Card } from "@/components/card";
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
import { deriveScreenState } from "@/lib/screen-state";
import { useSession } from "@/lib/session";
import { useRequiredWorldId, useWorldQuery } from "@/lib/world";
import {
  deriveOnboardingStep,
  type MobileIdentityProjection,
} from "@/screens/onboarding/onboarding-model";
import { derivePlayerDevView } from "@/screens/player-dev/player-dev-model";
import {
  buildTalkToPlayerPayload,
  STANCE_OPTIONS,
  talkIdempotencyKey,
  type TalkStance,
} from "@/screens/talk/talk-model";
import { color, fontSize, fontWeight, radius, space } from "@/theme";

interface PlayerDevelopmentProjection {
  readonly development: PlayerDevelopmentView | null;
}

const ATTRIBUTE_LABEL: Readonly<Record<string, string>> = {
  finishing: "Finalização",
  shortPassing: "Passe curto",
  longPassing: "Passe longo",
  dribbling: "Drible",
  crossing: "Cruzamento",
  marking: "Marcação",
  tackling: "Desarme",
  heading: "Cabeceio",
  pace: "Velocidade",
  stamina: "Resistência",
  strength: "Força",
  agility: "Agilidade",
  vision: "Visão de jogo",
  composure: "Frieza",
  positioning: "Posicionamento",
  reflexes: "Reflexos",
  handling: "Defesa (mãos)",
  diving: "Elasticidade",
};
const attributeLabel = (code: string): string => ATTRIBUTE_LABEL[code] ?? code;

/**
 * Desenvolvimento do jogador (M-PLAYER-DEV, R-221) + a conversa que move a forma
 * (M-CONVO, fase 2c).
 *
 * O que a tela existe para responder: a habilidade que a partida lê é NÚCLEO
 * (permanente, sobe por treino) + FORMA (transiente, move por partida/decisão e
 * decai). Sem separar as duas, "meu jogador caiu de 65 para 61" parece bug.
 *
 * Toda a leitura vive em `player-dev-model.ts` e os payloads em `talk-model.ts`,
 * ambos testados. Aqui só renderiza e despacha.
 */
export function PlayerDev({ playerId }: { readonly playerId: string }) {
  const { session, status, client, contractVersion } = useSession();
  const worldId = useRequiredWorldId();
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
  // A query aceita só playerId: o season corrente é resolvido no servidor (R-221).
  const devQuery = useWorldQuery<PlayerDevelopmentProjection>(
    "player-development",
    { playerId },
  );

  const view = useMemo(
    () =>
      devQuery.data?.development == null
        ? null
        : derivePlayerDevView(devQuery.data.development),
    [devQuery.data],
  );

  const refresh = useCallback(() => {
    clubQuery.refetch();
    devQuery.refetch();
  }, [clubQuery.refetch, devQuery.refetch]);

  /** Elogiar/criticar — move a FORMA, não o núcleo. */
  const talk = useCallback(
    (stance: TalkStance) => {
      if (managedClub === null || client === null || contractVersion === null) {
        return;
      }
      const commandType = "morale:talk-to-player";
      const idempotencyKey = talkIdempotencyKey({
        commandType,
        targetId: playerId,
        stance,
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
        payload: buildTalkToPlayerPayload({
          clubId: managedClub.id,
          playerId,
          stance,
        }),
        idempotencyKey,
        correlationId: `mobile:${idempotencyKey}`,
      }).then((result) => {
        setTracking(result);
        if (
          result.status === CommandTrackingStatus.ACCEPTED ||
          result.status === CommandTrackingStatus.APPLIED
        ) {
          devQuery.refetch();
        }
      });
    },
    [managedClub, client, contractVersion, worldId, playerId, devQuery.refetch],
  );

  const screenState = deriveScreenState({
    session: status,
    hasCachedData: devQuery.isStale,
    command: tracking?.status,
    domainError:
      tracking?.status === CommandTrackingStatus.REJECTED &&
      tracking.errorCode !== null,
    query:
      devQuery.state === "loading"
        ? "loading"
        : devQuery.state === "offline"
          ? "offline"
          : devQuery.state === "error"
            ? "error"
            : devQuery.state === "empty"
              ? "empty"
              : "ready",
  });

  const busy = tracking?.status === CommandTrackingStatus.SUBMITTING;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          accessibilityState={{}}
          hitSlop={8}
          style={styles.back}
        >
          <Icon name="arrow-back" size={22} color={color.text} />
        </Pressable>
        <Text style={styles.headerTitle}>DESENVOLVIMENTO</Text>
        <View style={styles.back} />
      </View>

      {screenState !== "success" || view === null ? (
        <View style={styles.content}>
          <ScreenStatePanel
            state={screenState === "success" ? "empty" : screenState}
            title={view === null ? "SEM DESENVOLVIMENTO" : undefined}
            body={
              view === null
                ? "Este jogador não tem leitura de desenvolvimento neste mundo."
                : undefined
            }
            onRetry={refresh}
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<Refresh onRefresh={refresh} />}
        >
          {/* A decomposição: por que a habilidade que a partida lê não é o núcleo. */}
          <Card>
            <Text style={styles.cardTitle}>HABILIDADE EFETIVA</Text>
            <View style={styles.effectiveRow}>
              <Text style={styles.effectiveValue}>{view.effectiveAbility}</Text>
              <View style={styles.breakdown}>
                <Text style={styles.breakdownLine}>
                  núcleo <Text style={styles.breakdownStrong}>{view.core}</Text>
                </Text>
                <Text
                  style={[
                    styles.breakdownLine,
                    view.forma.tone === "up" && { color: color.success },
                    view.forma.tone === "down" && { color: color.danger },
                  ]}
                >
                  forma {view.forma.label}
                </Text>
              </View>
            </View>
            <Text style={styles.hint}>
              O núcleo é permanente e sobe por treino. A forma é transiente:
              move por partida e por decisão sua, e decai sozinha.
            </Text>
          </Card>

          {/* Até onde ele pode chegar. */}
          <Card>
            <Text style={styles.cardTitle}>POTENCIAL</Text>
            {view.layers.map((layer) => (
              <View key={layer.key} style={styles.layerRow}>
                <Text style={styles.layerLabel}>{layer.label}</Text>
                <Text style={styles.layerValue}>{layer.value}</Text>
              </View>
            ))}
            <Text style={styles.hint}>
              {view.atCeiling
                ? "No teto aproveitável: o núcleo não cresce mais sem destravar estrutura."
                : `Ainda pode crescer ${view.headroom} ponto(s) até o teto aproveitável.`}
            </Text>
          </Card>

          {/* O que a virada vai aplicar, se ela fosse hoje. */}
          <Card>
            <Text style={styles.cardTitle}>GANHOS PENDENTES</Text>
            {view.pendingGains.length === 0 ? (
              <Text style={styles.hint}>
                Nada acumulado nesta temporada. Ganhos aparecem conforme ele
                treina e joga.
              </Text>
            ) : (
              view.pendingGains.map((gain) => (
                <View key={gain.attributeCode} style={styles.layerRow}>
                  <Text style={styles.layerLabel}>
                    {attributeLabel(gain.attributeCode)}
                  </Text>
                  <Text style={styles.gainValue}>+{gain.projectedPoints}</Text>
                </View>
              ))
            )}
          </Card>

          {/* M-CONVO: a decisão que move a forma. */}
          <Card>
            <Text style={styles.cardTitle}>CONVERSA</Text>
            <Text style={styles.hint}>
              Elogiar ou criticar move a FORMA — não o núcleo. O efeito depende
              do perfil mental dele.
            </Text>
            <View style={styles.stanceRow}>
              {STANCE_OPTIONS.map((option) => (
                <Pressable
                  key={option.stance}
                  onPress={() => talk(option.stance)}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel={option.label}
                  accessibilityState={{ disabled: busy }}
                  style={[
                    styles.stance,
                    option.tone === "up"
                      ? styles.stanceUp
                      : styles.stanceDown,
                    busy && styles.stanceBusy,
                  ]}
                >
                  <Text style={styles.stanceText}>
                    {busy ? "…" : option.label.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
            {tracking?.status === CommandTrackingStatus.REJECTED ? (
              <Text style={styles.error}>
                {tracking.errorCode ?? "COMMAND_REJECTED"}
              </Text>
            ) : null}
          </Card>
        </ScrollView>
      )}
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
    fontSize: fontSize.lg,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
    letterSpacing: 0.5,
  },
  content: { padding: space.lg, gap: space.md, paddingBottom: space.xl4 },
  cardTitle: {
    color: color.textMuted,
    fontSize: 9,
    fontWeight: fontWeight.bold as "700",
    letterSpacing: 0.3,
    marginBottom: space.sm,
  },
  effectiveRow: { flexDirection: "row", alignItems: "center", gap: space.lg },
  effectiveValue: {
    color: color.primary,
    fontSize: 44,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
  },
  breakdown: { gap: 2 },
  breakdownLine: { color: color.textMuted, fontSize: fontSize.sm },
  breakdownStrong: {
    color: color.text,
    fontWeight: fontWeight.bold as "700",
  },
  hint: { color: color.textMuted, fontSize: fontSize.xs, marginTop: space.sm },
  layerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: space.xs,
  },
  layerLabel: { color: color.text, fontSize: fontSize.sm },
  layerValue: {
    color: color.textMuted,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as "700",
  },
  gainValue: {
    color: color.success,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as "700",
  },
  stanceRow: { flexDirection: "row", gap: space.sm, marginTop: space.sm },
  stance: {
    flex: 1,
    alignItems: "center",
    paddingVertical: space.sm,
    borderRadius: radius.pill,
  },
  stanceUp: { backgroundColor: color.success },
  stanceDown: { backgroundColor: color.danger },
  stanceBusy: { opacity: 0.5 },
  stanceText: {
    color: color.background,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold as "700",
  },
  error: {
    color: color.danger,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold as "700",
    marginTop: space.sm,
  },
});
