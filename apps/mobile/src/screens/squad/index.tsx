import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  findNodeHandle,
  ScrollView,
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CommandTrackingStatus } from "@grinta/core";
import { Icon } from "@/components/icon";
import { MINIMUM_TOUCH_TARGET, useReducedMotion } from "@/lib/accessibility";
import { Refresh } from "@/components/refresh";
import { ScreenStatePanel } from "@/components/screen-state-panel";
import {
  selectManagedClub,
  squadPlayersFromRoster,
  type ClubPortfolioProjection,
  type MobileRosterProjection,
} from "@/lib/club-projection";
import {
  submitTrackedCommand,
  type TrackedCommandResult,
} from "@/lib/command-orchestrator";
import { deriveScreenState } from "@/lib/screen-state";
import { useSession } from "@/lib/session";
import { useWorldId, useWorldQuery } from "@/lib/world";
import {
  clearLineupDraft,
  readLineupDraft,
  writeLineupDraft,
} from "./lineup-draft";
import { desiredSlots, lineupDiffers, planLineupSync } from "./lineup-sync";
import {
  deriveOnboardingStep,
  type MobileIdentityProjection,
} from "@/screens/onboarding/onboarding-model";
import { color, space, radius, fontSize, fontWeight } from "@/theme";
import type { SquadPlayer } from "./squad-data";
import {
  FORMATIONS,
  FORMATION_KEYS,
  assignToFormation,
  type FormationKey,
} from "./formations";
import { Pitch } from "./pitch";
import { PlayerCard } from "./player-card";

/** Tela de Elenco: campo tático (formação editável) + modal de substituição. */
export function Squad() {
  const reducedMotion = useReducedMotion();
  const sheetRef = useRef<View>(null);
  const worldId = useWorldId();
  const { client, session, status, contractVersion } = useSession();
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
  // O elenco é da query `roster`, recortada pelo clube gerido (R-190). `null`
  // enquanto o clube não é conhecido — a query só dispara com o clubId em mãos.
  const rosterQuery = useWorldQuery<MobileRosterProjection>(
    managedClub === null ? null : "roster",
    managedClub === null ? undefined : { clubId: managedClub.id },
  );
  const officialPlayers = useMemo(
    () => squadPlayersFromRoster(rosterQuery.data),
    [rosterQuery.data],
  );
  const players = officialPlayers;
  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const playerById = useCallback((id: string) => byId.get(id), [byId]);

  const [formation, setFormation] = useState<FormationKey>("4-2-1-3");
  const [onPitchIds, setOnPitchIds] = useState<string[]>(() =>
    assignToFormation(
      players.filter((p) => p.starter),
      "4-2-1-3",
    ),
  );
  const [benchIds, setBenchIds] = useState<string[]>(() =>
    players.filter((p) => !p.starter).map((p) => p.id),
  );
  const [activeSlot, setActiveSlot] = useState<number | null>(null);

  const slots = FORMATIONS[formation];
  const avgOvr = useMemo(() => {
    const ovrs = onPitchIds.map((id) => byId.get(id)?.ovr ?? 0);
    return Math.round(ovrs.reduce((a, b) => a + b, 0) / (ovrs.length || 1));
  }, [onPitchIds, byId]);

  const changeFormation = useCallback(
    (key: FormationKey) => {
      setOnPitchIds((prev) => {
        const current = prev
          .map((id) => byId.get(id))
          .filter((p): p is SquadPlayer => Boolean(p));
        return assignToFormation(current, key);
      });
      setFormation(key);
      setActiveSlot(null);
    },
    [byId],
  );

  const closeSheet = useCallback(() => setActiveSlot(null), []);
  const focusSheet = useCallback(() => {
    const node = findNodeHandle(sheetRef.current);
    if (node !== null) AccessibilityInfo.setAccessibilityFocus(node);
  }, []);

  const squad = useMemo(
    () =>
      clubQuery.data?.squads?.find(
        (candidate) => candidate.clubId === managedClub?.id,
      ) ?? null,
    [clubQuery.data, managedClub?.id],
  );

  // Hidrata uma vez por clube: rascunho salvo (SET_LINEUP_DRAFT) se ainda for
  // válido para o roster atual, senão a escalação oficial. Refetchs NÃO apagam
  // mais a edição local — o rascunho sobrevive até salvar ou trocar de clube.
  const hydratedClubRef = useRef<string | null>(null);
  useEffect(() => {
    const clubId = managedClub?.id ?? null;
    if (clubId === null || players.length < 11) return;
    if (hydratedClubRef.current === clubId) return;
    hydratedClubRef.current = clubId;
    const ids = new Set(players.map((p) => p.id));
    void readLineupDraft(worldId, clubId).then((draft) => {
      const valid =
        draft !== null &&
        draft.onPitchIds.length === 11 &&
        [...draft.onPitchIds, ...draft.benchIds].every((id) => ids.has(id));
      if (valid) {
        setFormation(draft.formation);
        setOnPitchIds([...draft.onPitchIds]);
        setBenchIds([...draft.benchIds]);
      } else {
        setFormation("4-2-1-3");
        setOnPitchIds(
          assignToFormation(
            players.filter((p) => p.starter),
            "4-2-1-3",
          ),
        );
        setBenchIds(players.filter((p) => !p.starter).map((p) => p.id));
      }
      setActiveSlot(null);
    });
  }, [managedClub?.id, players, worldId]);

  // Persiste o rascunho a cada edição (pós-hidratação).
  useEffect(() => {
    const clubId = managedClub?.id ?? null;
    if (clubId === null || hydratedClubRef.current !== clubId) return;
    if (onPitchIds.length < 11) return;
    void writeLineupDraft(worldId, clubId, {
      formation,
      onPitchIds,
      benchIds,
    });
  }, [formation, onPitchIds, benchIds, managedClub?.id, worldId]);

  const desired = useMemo(
    () => desiredSlots(onPitchIds, benchIds),
    [onPitchIds, benchIds],
  );
  const dirty =
    squad !== null &&
    onPitchIds.length === 11 &&
    lineupDiffers(squad.memberships, desired);
  const [syncTracking, setSyncTracking] =
    useState<TrackedCommandResult | null>(null);
  const syncing = syncTracking?.status === CommandTrackingStatus.SUBMITTING;

  const saveLineup = useCallback(() => {
    if (
      squad === null ||
      managedClub === null ||
      client === null ||
      contractVersion === null ||
      !dirty
    ) {
      return;
    }
    const plan = planLineupSync(squad.memberships, desired);
    Alert.alert(
      "Salvar escalação?",
      `${plan.length / 2} jogador(es) mudam de posição no elenco oficial.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Salvar",
          onPress: () => {
            const occurredAt = clubQuery.asOf ?? "2026-01-01";
            const baseKey = `lineup:${squad.id}:${squad.version}`;
            setSyncTracking({
              status: CommandTrackingStatus.SUBMITTING,
              commandId: null,
              resource: null,
              correlationId: `mobile:${baseKey}`,
              errorCode: null,
            });
            void (async () => {
              let expectedVersion = squad.version;
              for (const [index, command] of plan.entries()) {
                const result = await submitTrackedCommand(client, {
                  clientContractVersion: "v1",
                  serverContractVersion: contractVersion,
                  commandType: "club:command",
                  worldId,
                  expectedVersion,
                  payload: {
                    clubId: managedClub.id,
                    actorId: session?.subject ?? "mobile",
                    occurredAt,
                    command: { ...command, squadId: squad.id },
                  },
                  idempotencyKey: `${baseKey}:${index}`,
                  correlationId: `mobile:${baseKey}:${index}`,
                });
                if (
                  result.status !== CommandTrackingStatus.ACCEPTED &&
                  result.status !== CommandTrackingStatus.APPLIED
                ) {
                  setSyncTracking(result);
                  clubQuery.refetch();
                  return;
                }
                expectedVersion += 1;
              }
              await clearLineupDraft(worldId, managedClub.id);
              setSyncTracking({
                status: CommandTrackingStatus.APPLIED,
                commandId: null,
                resource: `squad:${squad.id}`,
                correlationId: `mobile:${baseKey}`,
                errorCode: null,
              });
              clubQuery.refetch();
              rosterQuery.refetch();
            })();
          },
        },
      ],
    );
  }, [
    client,
    clubQuery,
    contractVersion,
    desired,
    dirty,
    managedClub,
    rosterQuery,
    session?.subject,
    squad,
    worldId,
  ]);

  const refresh = useCallback(() => {
    clubQuery.refetch();
    identityQuery.refetch();
    rosterQuery.refetch();
  }, [clubQuery.refetch, identityQuery.refetch, rosterQuery.refetch]);

  const substitute = useCallback(
    (benchPlayerId: string) => {
      if (activeSlot === null) return;
      const outgoing = onPitchIds[activeSlot];
      setOnPitchIds((prev) => {
        const next = [...prev];
        next[activeSlot] = benchPlayerId;
        return next;
      });
      setBenchIds((b) =>
        b.map((id) => (id === benchPlayerId ? (outgoing ?? id) : id)),
      );
      setActiveSlot(null);
    },
    [activeSlot, onPitchIds],
  );

  const outgoing =
    activeSlot !== null ? byId.get(onPitchIds[activeSlot] ?? "") : undefined;
  const outgoingRole =
    activeSlot !== null ? slots[activeSlot]?.role : undefined;

  const queryState =
    clubQuery.state === "loading" ||
    rosterQuery.state === "loading" ||
    identityQuery.state === "loading"
      ? "loading"
      : clubQuery.state === "offline" ||
          rosterQuery.state === "offline" ||
          identityQuery.state === "offline"
        ? "offline"
        : clubQuery.state === "error" ||
            rosterQuery.state === "error" ||
            identityQuery.state === "error"
          ? "error"
          : clubQuery.state === "empty" ||
              rosterQuery.state === "empty" ||
              identityQuery.state === "empty"
            ? "empty"
            : "ready";
  const screenState = deriveScreenState({
    session: status,
    query: queryState,
    hasCachedData:
      clubQuery.isStale || rosterQuery.isStale || identityQuery.isStale,
  });

  if (
    screenState !== "success" ||
    managedClub === null ||
    players.length < 11
  ) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.content}>
          <ScreenStatePanel
            state={screenState === "success" ? "empty" : screenState}
            title={
              players.length > 0 && players.length < 11
                ? "ELENCO OFICIAL INCOMPLETO"
                : undefined
            }
            body={
              players.length > 0 && players.length < 11
                ? `A projeção oficial retornou ${players.length} jogadores; são necessários 11 para montar o campo.`
                : undefined
            }
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
          <View>
            <Text style={styles.title}>ELENCO</Text>
            <Text style={styles.subtitle}>
              {managedClub.name.toUpperCase()} · ELENCO OFICIAL
            </Text>
          </View>
          <View style={styles.ovrPill}>
            <Text style={styles.ovrLabel}>MÉDIA XI</Text>
            <Text style={styles.ovrValue}>{avgOvr}</Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.formations}
        >
          {FORMATION_KEYS.map((key) => {
            const active = key === formation;
            return (
              <Pressable
                key={key}
                style={[
                  styles.formationChip,
                  active ? styles.formationActive : null,
                ]}
                onPress={() => changeFormation(key)}
                accessibilityRole="button"
                accessibilityLabel={`Usar formação ${key}`}
                accessibilityState={{ selected: active }}
              >
                <Icon
                  name="grid"
                  size={13}
                  color={active ? color.primary : color.textMuted}
                />
                <Text
                  style={[
                    styles.formationText,
                    active ? styles.formationTextActive : null,
                  ]}
                >
                  {key}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Pitch
          slots={slots}
          playerIds={onPitchIds}
          playerById={playerById}
          selectedSlot={activeSlot}
          onSelectSlot={setActiveSlot}
        />

        <View style={styles.hint}>
          <Icon name="swap-horizontal" size={14} color={color.textMuted} />
          <Text style={styles.hintText}>
            Toque num jogador do campo para substituir · {benchIds.length}{" "}
            reservas
          </Text>
        </View>

        {dirty || syncTracking?.status === CommandTrackingStatus.REJECTED ? (
          <View style={styles.saveBar}>
            <View style={{ flex: 1 }}>
              <Text style={styles.saveTitle}>
                {dirty ? "ESCALAÇÃO NÃO SALVA" : "FALHA AO SALVAR"}
              </Text>
              <Text style={styles.saveNote}>
                {syncTracking?.status === CommandTrackingStatus.REJECTED
                  ? `Rejeitado: ${syncTracking.errorCode ?? "erro de domínio"}. Recarregue e tente de novo.`
                  : "O rascunho está só neste aparelho até você salvar."}
              </Text>
            </View>
            {syncing ? (
              <ActivityIndicator color={color.primary} />
            ) : dirty ? (
              <Pressable
                style={styles.saveButton}
                onPress={saveLineup}
                accessibilityRole="button"
                accessibilityLabel="Salvar escalação oficial"
              >
                <Text style={styles.saveButtonText}>SALVAR</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <Modal
        visible={activeSlot !== null}
        transparent
        animationType={reducedMotion ? "none" : "slide"}
        onRequestClose={closeSheet}
        onShow={focusSheet}
        accessibilityViewIsModal
      >
        <Pressable style={styles.backdrop} onPress={closeSheet} />
        <View ref={sheetRef} style={styles.sheet} accessible>
          <View style={styles.handle} />
          <View style={styles.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetTitle}>SUBSTITUIR</Text>
              {outgoing ? (
                <Text style={styles.sheetSub}>
                  Sai <Text style={styles.sheetOut}>{outgoing.name}</Text>
                  {outgoingRole ? ` (${outgoingRole})` : ""}
                </Text>
              ) : null}
            </View>
            <Pressable
              onPress={closeSheet}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Fechar substituição"
              style={styles.closeBtn}
            >
              <Icon name="remove" size={18} color={color.text} />
            </Pressable>
          </View>
          <Text style={styles.sheetSection}>
            ENTRA — RESERVAS ({benchIds.length})
          </Text>
          <ScrollView
            contentContainerStyle={styles.sheetList}
            showsVerticalScrollIndicator={false}
          >
            {benchIds.length === 0 ? (
              <Text style={styles.empty}>Sem reservas disponíveis.</Text>
            ) : (
              benchIds.map((id) => {
                const p = byId.get(id);
                if (!p) return null;
                return (
                  <Pressable
                    key={id}
                    onPress={() => substitute(id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Escalar ${p.name}`}
                    style={styles.benchRow}
                  >
                    <PlayerCard p={p} />
                    <View style={styles.enterBadge}>
                      <Icon
                        name="arrow-up"
                        size={12}
                        color={color.primaryContrast}
                      />
                      <Text style={styles.enterText}>ENTRAR</Text>
                    </View>
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.background },
  content: { padding: space.lg, gap: space.md, paddingBottom: space.xl4 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    color: color.text,
    fontSize: fontSize.xl2,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
    letterSpacing: 0.5,
  },
  subtitle: {
    color: color.primary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold as "700",
    letterSpacing: 0.5,
    marginTop: -2,
  },
  ovrPill: {
    alignItems: "center",
    borderWidth: 1,
    borderColor: color.borderStrong,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
  ovrLabel: {
    color: color.textMuted,
    fontSize: 8,
    fontWeight: fontWeight.bold as "700",
    letterSpacing: 0.5,
  },
  ovrValue: {
    color: color.primary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
  },
  formations: { gap: space.sm, paddingRight: space.lg },
  formationChip: {
    minHeight: MINIMUM_TOUCH_TARGET,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    backgroundColor: color.surface,
  },
  formationActive: { borderColor: color.primary, backgroundColor: "#151c0e" },
  formationText: {
    color: color.textMuted,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
    letterSpacing: 0.5,
  },
  formationTextActive: { color: color.primary },
  hint: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: color.surface,
    borderColor: color.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: space.md,
  },
  hintText: { color: color.textMuted, fontSize: fontSize.xs, flex: 1 },
  saveBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: "#151c0e",
    borderColor: color.primaryDim,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: space.md,
  },
  saveTitle: {
    color: color.primary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
    letterSpacing: 0.5,
  },
  saveNote: { color: color.textMuted, fontSize: 10, marginTop: 2 },
  saveButton: {
    minHeight: MINIMUM_TOUCH_TARGET,
    justifyContent: "center",
    borderRadius: radius.sm,
    backgroundColor: color.primary,
    paddingHorizontal: space.lg,
  },
  saveButtonText: {
    color: color.primaryContrast,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.black as "800",
    letterSpacing: 0.5,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: "78%",
    backgroundColor: color.backgroundElevated,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderColor: color.border,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.xl2,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: color.borderStrong,
    marginBottom: space.md,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: space.md,
  },
  sheetTitle: {
    color: color.text,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
    letterSpacing: 0.5,
  },
  sheetSub: { color: color.textMuted, fontSize: fontSize.xs, marginTop: 1 },
  sheetOut: { color: color.danger, fontWeight: fontWeight.bold as "700" },
  closeBtn: {
    width: MINIMUM_TOUCH_TARGET,
    height: MINIMUM_TOUCH_TARGET,
    borderRadius: 16,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetSection: {
    color: color.primary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
    letterSpacing: 0.5,
    marginBottom: space.sm,
  },
  sheetList: { gap: space.sm },
  empty: {
    color: color.textMuted,
    fontSize: fontSize.sm,
    textAlign: "center",
    paddingVertical: space.xl,
  },
  benchRow: { minHeight: MINIMUM_TOUCH_TARGET },
  enterBadge: {
    position: "absolute",
    right: space.md,
    top: "50%",
    marginTop: -11,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: color.primary,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 4,
  },
  enterText: {
    color: color.primaryContrast,
    fontSize: 10,
    fontWeight: fontWeight.black as "800",
    letterSpacing: 0.5,
  },
});
