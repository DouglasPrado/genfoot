import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { CommandTrackingStatus } from "@grinta/core";

import { Card } from "@/components/card";
import { Icon } from "@/components/icon";
import { Refresh } from "@/components/refresh";
import { ScreenStatePanel } from "@/components/screen-state-panel";
import { useToast } from "@/components/toast";
import {
  selectManagedClub,
  type ClubPortfolioProjection,
} from "@/lib/club-projection";
import { commandFeedback } from "@/lib/command-feedback";
import {
  submitTrackedCommand,
  type TrackedCommandResult,
} from "@/lib/command-orchestrator";
import { commandIdempotencyKey, onEntity, onRevision } from "@/lib/idempotency";
import { deriveScreenState } from "@/lib/screen-state";
import { useSession } from "@/lib/session";
import { useRequiredWorldId, useWorldQuery } from "@/lib/world";
import {
  deriveOnboardingStep,
  type MobileIdentityProjection,
} from "@/screens/onboarding/onboarding-model";
import {
  buildLinkMentorPayload,
  buildUnlinkMentorPayload,
  eligibleMentors,
  type MentorCandidate,
} from "@/screens/mentoring/mentoring-model";
import { color, fontSize, fontWeight, radius, space } from "@/theme";

interface RosterPlayer extends MentorCandidate {
  readonly availability: string;
}
interface RosterProjection {
  readonly players: readonly RosterPlayer[];
}
interface MentorshipProjection {
  readonly mentorId: string | null;
  readonly version: number | null;
}

/**
 * Mentoria (M-MENTORING): vincular um veterano como mentor de um pupilo, para a
 * evolução acelerada da virada. A tela só oferece mentores elegíveis (mais
 * velhos); a decisão vive em `mentoring-model.ts`.
 */
export function Mentoring({ playerId }: { readonly playerId: string }) {
  const { session, status, client, contractVersion } = useSession();
  const worldId = useRequiredWorldId();
  const toast = useToast();
  const [tracking, setTracking] = useState<TrackedCommandResult | null>(null);

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
  const youthQuery = useWorldQuery<RosterProjection>(
    managedClub === null ? null : "youth",
    managedClub === null ? undefined : { clubId: managedClub.id },
  );
  const mentorshipQuery = useWorldQuery<MentorshipProjection>(
    managedClub === null ? null : "mentorship",
    managedClub === null ? undefined : { clubId: managedClub.id, menteeId: playerId },
  );

  const allPlayers = useMemo(
    () => [
      ...(rosterQuery.data?.players ?? []),
      ...(youthQuery.data?.players ?? []),
    ],
    [rosterQuery.data, youthQuery.data],
  );
  const mentee = useMemo(
    () => allPlayers.find((p) => p.playerId === playerId) ?? null,
    [allPlayers, playerId],
  );
  const currentMentorId = mentorshipQuery.data?.mentorId ?? null;
  const currentMentor = useMemo(
    () => allPlayers.find((p) => p.playerId === currentMentorId) ?? null,
    [allPlayers, currentMentorId],
  );
  const mentors = useMemo(
    () => (mentee === null ? [] : eligibleMentors(allPlayers, playerId, mentee.age)),
    [allPlayers, mentee, playerId],
  );

  const refresh = useCallback(() => {
    clubQuery.refetch();
    rosterQuery.refetch();
    youthQuery.refetch();
    mentorshipQuery.refetch();
  }, [clubQuery.refetch, rosterQuery.refetch, youthQuery.refetch, mentorshipQuery.refetch]);

  const dispatch = useCallback(
    (
      commandType: "mentoring:link-mentor" | "mentoring:unlink-mentor",
      payload: Record<string, unknown>,
      idempotencyKey: string,
      okText: string,
    ) => {
      if (client === null || contractVersion === null) return;
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
        payload,
        idempotencyKey,
        correlationId: `mobile:${idempotencyKey}`,
      }).then((result) => {
        setTracking(result);
        const fb = commandFeedback(result, okText);
        if (fb !== null) toast.show(fb);
        if (
          result.status === CommandTrackingStatus.ACCEPTED ||
          result.status === CommandTrackingStatus.APPLIED
        ) {
          mentorshipQuery.refetch();
        }
      });
    },
    [client, contractVersion, worldId, toast, mentorshipQuery.refetch],
  );

  const link = useCallback(
    (mentorId: string) => {
      if (managedClub === null) return;
      const payload = buildLinkMentorPayload({
        clubId: managedClub.id,
        menteeId: playerId,
        mentorId,
        expectedVersion: mentorshipQuery.data?.version ?? null,
      });
      if ("error" in payload) {
        toast.show({ tone: "error", text: "Escolha um mentor válido." });
        return;
      }
      dispatch(
        "mentoring:link-mentor",
        { ...payload },
        commandIdempotencyKey({
          commandType: "mentoring:link-mentor",
          target: playerId,
          occasion: onRevision(mentorshipQuery.data?.version ?? 0, mentorId),
        }),
        "Mentor vinculado.",
      );
    },
    [managedClub, playerId, mentorshipQuery.data, dispatch, toast],
  );

  const unlink = useCallback(() => {
    if (managedClub === null) return;
    dispatch(
      "mentoring:unlink-mentor",
      { ...buildUnlinkMentorPayload({ clubId: managedClub.id, menteeId: playerId }) },
      commandIdempotencyKey({
        commandType: "mentoring:unlink-mentor",
        target: playerId,
        occasion: onEntity(String(mentorshipQuery.data?.version ?? 0)),
      }),
      "Mentor desvinculado.",
    );
  }, [managedClub, playerId, mentorshipQuery.data, dispatch]);

  const anyLoading =
    rosterQuery.state === "loading" || youthQuery.state === "loading";
  const screenState = deriveScreenState({
    session: status,
    hasCachedData: rosterQuery.isStale,
    query: mentee !== null ? "ready" : anyLoading ? "loading" : "empty",
  });

  if (screenState !== "success" || mentee === null) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <Header onBack={() => router.back()} name={mentee?.name ?? "Mentoria"} />
        <ScreenStatePanel
          state={screenState === "success" ? "empty" : screenState}
          title={mentee === null ? "JOGADOR NÃO ENCONTRADO" : undefined}
          body={mentee === null ? "Este jogador não está no elenco lido." : undefined}
          onRetry={refresh}
        />
      </SafeAreaView>
    );
  }

  const busy = tracking?.status === CommandTrackingStatus.SUBMITTING;

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <Header onBack={() => router.back()} name={mentee.name} />
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<Refresh onRefresh={refresh} />}
      >
        <Card>
          <Text style={styles.cardTitle}>MENTOR ATUAL</Text>
          {mentorshipQuery.state === "error" || mentorshipQuery.state === "offline" ? (
            <Text style={styles.hint}>Não consegui ler o vínculo atual.</Text>
          ) : currentMentorId === null ? (
            <Text style={styles.hint}>
              {mentee.name} não tem mentor. Vincule um veterano abaixo para acelerar
              o desenvolvimento na virada.
            </Text>
          ) : (
            <View style={styles.currentRow}>
              <Icon name="star" size={18} color={color.primary} />
              <Text style={styles.currentName} numberOfLines={1}>
                {currentMentor?.name ?? "Mentor"}
                {currentMentor != null ? ` · ${currentMentor.primaryPosition} · ${currentMentor.age}a` : ""}
              </Text>
              <Pressable
                onPress={unlink}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel="Desvincular mentor"
                accessibilityState={{ disabled: busy }}
                style={[styles.unlink, busy && styles.disabled]}
              >
                <Text style={styles.unlinkText}>DESVINCULAR</Text>
              </Pressable>
            </View>
          )}
        </Card>

        <Card>
          <Text style={styles.cardTitle}>MENTORES ELEGÍVEIS (VETERANOS)</Text>
          {mentors.length === 0 ? (
            <Text style={styles.hint}>
              Nenhum jogador mais velho que {mentee.name} no elenco para mentorar.
            </Text>
          ) : (
            mentors.map((m) => {
              const isCurrent = m.playerId === currentMentorId;
              return (
                <Pressable
                  key={m.playerId}
                  onPress={() => link(m.playerId)}
                  disabled={busy || isCurrent}
                  accessibilityRole="button"
                  accessibilityLabel={`Vincular ${m.name} como mentor`}
                  accessibilityState={{ selected: isCurrent, disabled: busy || isCurrent }}
                  style={[styles.mentorRow, isCurrent && styles.mentorRowActive]}
                >
                  <View style={styles.info}>
                    <Text style={styles.mentorName} numberOfLines={1}>{m.name}</Text>
                    <Text style={styles.mentorMeta}>{m.primaryPosition} · {m.age} anos · OVR {m.overall}</Text>
                  </View>
                  {isCurrent ? (
                    <Text style={styles.currentTag}>MENTOR</Text>
                  ) : (
                    <Text style={styles.linkTag}>VINCULAR</Text>
                  )}
                </Pressable>
              );
            })
          )}
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
      <Text style={styles.headerTitle} numberOfLines={1}>{name} · mentoria</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.background },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: space.md, paddingVertical: space.sm, gap: space.sm,
  },
  back: { padding: space.xs },
  headerTitle: { flex: 1, color: color.text, fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  body: { padding: space.md, gap: space.md },
  cardTitle: {
    color: color.textMuted, fontSize: fontSize.sm, fontWeight: fontWeight.bold,
    letterSpacing: 1, marginBottom: space.xs,
  },
  hint: { color: color.textMuted, fontSize: fontSize.sm },
  currentRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  currentName: { flex: 1, color: color.text, fontSize: fontSize.md, fontWeight: fontWeight.bold },
  unlink: {
    paddingHorizontal: space.sm, paddingVertical: space.xs,
    borderRadius: radius.pill, borderWidth: 1, borderColor: color.danger,
  },
  unlinkText: { color: color.danger, fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  disabled: { opacity: 0.5 },
  mentorRow: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: space.sm, gap: space.sm,
    borderTopWidth: 1, borderTopColor: color.border,
  },
  mentorRowActive: { opacity: 0.7 },
  info: { flex: 1 },
  mentorName: { color: color.text, fontSize: fontSize.md, fontWeight: fontWeight.bold },
  mentorMeta: { color: color.textMuted, fontSize: fontSize.xs },
  linkTag: { color: color.primary, fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  currentTag: { color: color.success, fontSize: fontSize.xs, fontWeight: fontWeight.bold },
});
