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
import {
  buildTalkToSquadPayload,
  STANCE_OPTIONS,
  talkIdempotencyKey,
  type TalkStance,
} from "@/screens/talk/talk-model";
import {
  FOCUS_OPTIONS,
  buildSetPlanPayload,
  clampIntensity,
  intensityLabel,
  type PlanFocus,
} from "@/screens/training-plan/training-plan-model";
import {
  buildStartSessionPayload,
  buildTrainingRows,
  summarizeTraining,
  type TrainingRow,
} from "@/screens/training-session/training-session-model";
import { color, fontSize, fontWeight, radius, space } from "@/theme";

interface RosterPlayer {
  readonly playerId: string;
  readonly shirtNumber: number;
  readonly name: string;
  readonly primaryPosition: string;
  readonly overall: number;
  readonly availability: string;
  readonly attributes?: Record<string, number | null> | null;
}

interface RosterProjection {
  readonly players: readonly RosterPlayer[];
}

interface ActiveSession {
  readonly id: string;
  readonly playerId: string;
  readonly attributeCode: string;
  readonly startDate: string;
  readonly durationDays: number;
}

interface TrainingSessionsProjection {
  readonly sessions: readonly ActiveSession[];
}

interface TrainingPlanProjection {
  readonly plan: {
    readonly name: string;
    readonly focus: string;
    readonly intensity: number;
    readonly version: number;
  } | null;
}

/** Rótulo PT dos atributos que a tela oferece como foco. */
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
 * Treino (M-TRAINING) — o elenco e o estado de treino de cada jogador.
 *
 * Toda a decisão (estado da sessão, progresso, payload) vive em
 * `training-session-model.ts` e é testada lá. Aqui só renderiza e despacha.
 */
export function Training() {
  const { session, status, client, contractVersion } = useSession();
  const worldId = useRequiredWorldId();
  const [picking, setPicking] = useState<TrainingRow | null>(null);
  const [tracking, setTracking] = useState<TrackedCommandResult | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);

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
  const rosterQuery = useWorldQuery<RosterProjection>(
    managedClub === null ? null : "roster",
    managedClub === null ? undefined : { clubId: managedClub.id },
  );
  const sessionsQuery = useWorldQuery<TrainingSessionsProjection>(
    managedClub === null ? null : "training-sessions",
    managedClub === null ? undefined : { clubId: managedClub.id },
  );
  // Sem seasonId: o servidor resolve a temporada corrente (e a materializa se
  // faltar). O mobile não conhece o season.
  const planQuery = useWorldQuery<TrainingPlanProjection>(
    managedClub === null ? null : "training-plan",
    managedClub === null ? undefined : { clubId: managedClub.id },
  );
  const plan = planQuery.data?.plan ?? null;

  // O rascunho do plano. `null` = ainda não mexeu; cai no que o servidor tem.
  const [draftFocus, setDraftFocus] = useState<PlanFocus | null>(null);
  const [draftIntensity, setDraftIntensity] = useState<number | null>(null);
  const focus: PlanFocus =
    draftFocus ?? ((plan?.focus as PlanFocus | undefined) ?? "TECHNICAL");
  const intensity = draftIntensity ?? plan?.intensity ?? 50;
  const dirty =
    plan === null || focus !== plan.focus || intensity !== plan.intensity;
  /**
   * Só salva com a leitura do plano CONFIRMADA.
   *
   * Se a query falhou, `plan` é null e `expectedVersion` iria como null — o que
   * o servidor trata como "criar", sobrescrevendo um plano existente SEM
   * checagem de concorrência. A tela não pode arriscar apagar o plano do clube
   * porque não conseguiu lê-lo.
   */
  const planReadable = planQuery.state === "ready" || planQuery.state === "empty";
  const canSave = dirty && planReadable;

  // A data do MUNDO — nunca Date.now(). O progresso mostrado tem que bater com
  // o que a coleta rende no servidor.
  const worldDate = clubQuery.asOf ?? "";

  const rows = useMemo(
    () =>
      buildTrainingRows(
        rosterQuery.data?.players ?? [],
        sessionsQuery.data?.sessions ?? [],
        worldDate,
      ),
    [rosterQuery.data, sessionsQuery.data, worldDate],
  );
  const summary = useMemo(() => summarizeTraining(rows), [rows]);

  const attributesOf = useCallback(
    (playerId: string): readonly { code: string; value: number }[] => {
      const player = rosterQuery.data?.players.find(
        (p) => p.playerId === playerId,
      );
      const grid = player?.attributes ?? null;
      if (grid === null) return [];
      return Object.entries(grid)
        .filter((entry): entry is [string, number] => typeof entry[1] === "number")
        .map(([code, value]) => ({ code, value }))
        // Menor primeiro: é onde sobra mais espaço para crescer.
        .sort((a, b) => a.value - b.value);
    },
    [rosterQuery.data],
  );

  const refresh = useCallback(() => {
    clubQuery.refetch();
    rosterQuery.refetch();
    sessionsQuery.refetch();
    planQuery.refetch();
  }, [
    clubQuery.refetch,
    rosterQuery.refetch,
    sessionsQuery.refetch,
    planQuery.refetch,
  ]);

  /** Despacha start/collect. O efeito oficial é a query voltando, não o retorno. */
  const dispatch = useCallback(
    (
      commandType: string,
      playerId: string,
      payload: Record<string, unknown>,
      /**
       * A chave vem PRONTA de quem chama, escopada à ocasião.
       *
       * Era montada aqui como `${commandType}:${clubId}:${playerId}` — eterna.
       * Como o servidor deduplica por ela, o SEGUNDO ciclo de treino do mesmo
       * jogador voltava ALREADY_APPLIED: cada jogador podia treinar uma vez, e
       * nunca mais. Quem chama sabe qual é a ocasião (o dia, a sessão); este
       * despachante não.
       */
      idempotencyKey: string,
    ) => {
      if (managedClub === null || client === null || contractVersion === null) {
        return;
      }
      setActingId(playerId);
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
        setActingId(null);
        if (
          result.status === CommandTrackingStatus.ACCEPTED ||
          result.status === CommandTrackingStatus.APPLIED
        ) {
          setPicking(null);
          rosterQuery.refetch();
          sessionsQuery.refetch();
        }
      });
    },
    [
      managedClub,
      client,
      contractVersion,
      worldId,
      rosterQuery.refetch,
      sessionsQuery.refetch,
    ],
  );

  const startSession = useCallback(
    (row: TrainingRow, attributeCode: string) => {
      if (managedClub === null) return;
      const payload = buildStartSessionPayload({
        clubId: managedClub.id,
        playerId: row.playerId,
        attributeCode,
      });
      if ("error" in payload) return;
      if (worldDate === "") {
        setPlanError("Sem a data do mundo não é possível iniciar o treino com segurança.");
        return;
      }
      // Uma sessão por jogador por DIA lógico. Amanhã ele treina de novo.
      dispatch(
        "training:start-session",
        row.playerId,
        { ...payload },
        `training:start-session:${row.playerId}:${attributeCode}:${worldDate}`,
      );
    },
    [managedClub, dispatch, worldDate],
  );

  const collectSession = useCallback(
    (row: TrainingRow) => {
      // Escopo = a SESSÃO. Coletar duas vezes a mesma sessão é o mesmo efeito;
      // a sessão da semana que vem é outra ocasião e tem que valer.
      const sessionId =
        sessionsQuery.data?.sessions.find((s) => s.playerId === row.playerId)?.id ??
        null;
      if (sessionId === null) {
        setPlanError("Sessão não encontrada na leitura — recarregue antes de coletar.");
        return;
      }
      dispatch(
        "training:collect-session",
        row.playerId,
        { playerId: row.playerId },
        `training:collect-session:${sessionId}`,
      );
    },
    [dispatch, sessionsQuery.data],
  );

  /** Grava o plano COLETIVO: um foco e uma carga para o grupo inteiro. */
  const savePlan = useCallback(() => {
    if (managedClub === null || client === null || contractVersion === null) {
      return;
    }
    const payload = buildSetPlanPayload({
      clubId: managedClub.id,
      name: plan?.name ?? "Plano do elenco",
      focus,
      intensity,
      players: rosterQuery.data?.players ?? [],
      expectedVersion: plan?.version ?? null,
    });
    if ("error" in payload) {
      // Recusa própria da tela, com o motivo — não um branch vazio.
      setPlanError(
        payload.error === "NO_PLAYERS"
          ? "Um plano sem jogador não treina ninguém."
          : "O plano precisa de um nome.",
      );
      return;
    }
    setPlanError(null);
    /**
     * A chave carrega o CONTEÚDO do plano, não só a versão.
     *
     * Com `${clubId}:${version}` apenas, duas edições diferentes na mesma versão
     * colidiam — e a segunda era descartada em silêncio. Provado contra a API:
     * salvar MENTAL/30 e depois PHYSICAL/90 com a mesma chave devolvia
     * ACCEPTED e depois ALREADY_APPLIED, e o que ficou gravado foi MENTAL/30.
     * A escolha do usuário evaporava.
     *
     * Isso acontece sempre que o refetch pós-gravação falha: a tela segue com a
     * versão velha e a próxima edição reusa a chave. Incluindo foco e carga,
     * retentar a MESMA edição ainda dedupe (que é o ponto da idempotência), mas
     * uma edição DIFERENTE é outra conversa e vale.
     */
    const idempotencyKey = `training:set-plan:${managedClub.id}:${plan?.version ?? 0}:${focus}:${intensity}`;
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
      commandType: "training:set-plan",
      worldId,
      payload: { ...payload },
      idempotencyKey,
      correlationId: `mobile:${idempotencyKey}`,
    }).then((result) => {
      setTracking(result);
      if (
        result.status === CommandTrackingStatus.ACCEPTED ||
        result.status === CommandTrackingStatus.APPLIED
      ) {
        setDraftFocus(null);
        setDraftIntensity(null);
        planQuery.refetch();
      }
    });
  }, [
    managedClub,
    client,
    contractVersion,
    worldId,
    plan,
    focus,
    intensity,
    rosterQuery.data,
    planQuery.refetch,
  ]);

  /** Conversa com o ELENCO — move a forma de todo mundo de uma vez. */
  const talkToSquad = useCallback(
    (stance: TalkStance) => {
      if (managedClub === null || client === null || contractVersion === null) {
        return;
      }
      const commandType = "morale:talk-to-squad";
      if (worldDate === "") {
        setPlanError(
          "Sem a data do mundo não é possível registrar a conversa com segurança.",
        );
        return;
      }
      const idempotencyKey = talkIdempotencyKey({
        commandType,
        targetId: managedClub.id,
        stance,
        worldDate,
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
        payload: buildTalkToSquadPayload({ clubId: managedClub.id, stance }),
        idempotencyKey,
        correlationId: `mobile:${idempotencyKey}`,
      }).then((result) => {
        setTracking(result);
        if (
          result.status === CommandTrackingStatus.ACCEPTED ||
          result.status === CommandTrackingStatus.APPLIED
        ) {
          rosterQuery.refetch();
        }
      });
    },
    [
      managedClub,
      client,
      contractVersion,
      worldId,
      worldDate,
      rosterQuery.refetch,
    ],
  );

  const screenState = deriveScreenState({
    session: status,
    hasCachedData:
      clubQuery.isStale || rosterQuery.isStale || sessionsQuery.isStale,
    command: tracking?.status,
    domainError:
      tracking?.status === CommandTrackingStatus.REJECTED &&
      tracking.errorCode !== null,
    query:
      clubQuery.state === "loading" ||
      rosterQuery.state === "loading" ||
      sessionsQuery.state === "loading"
        ? "loading"
        : clubQuery.state === "offline" ||
            rosterQuery.state === "offline" ||
            sessionsQuery.state === "offline"
          ? "offline"
          : clubQuery.state === "error" ||
              rosterQuery.state === "error" ||
              sessionsQuery.state === "error"
            ? "error"
            : "ready",
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
        <Text style={styles.headerTitle}>TREINO</Text>
        <View style={styles.back} />
      </View>

      {screenState !== "success" || managedClub === null ? (
        <View style={styles.content}>
          <ScreenStatePanel
            state={screenState === "success" ? "empty" : screenState}
            title={managedClub === null ? "SEM CLUBE" : undefined}
            body={
              managedClub === null
                ? "Conclua a escolha de clube para treinar o elenco."
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
          <Card>
            <View style={styles.summary}>
              <Summary label="TREINANDO" value={summary.training} tone="primary" />
              <Summary label="LIVRES" value={summary.idle} tone="text" />
              <Summary label="BLOQUEADOS" value={summary.blocked} tone="warning" />
            </View>
            <Text style={styles.summaryHint}>
              {summary.collectable > 0
                ? `${summary.collectable} sessão(ões) podem ser coletadas agora — coletar antes do fim rende ganho parcial.`
                : "Nenhuma sessão em andamento."}
            </Text>
          </Card>

          {/* O plano COLETIVO: um foco e uma carga para o grupo. */}
          <Card>
            <Text style={styles.cardTitle}>PLANO DO ELENCO</Text>
            <Text style={styles.summaryHint}>
              {/*
                "Sem plano" e "não consegui ler o plano" são coisas diferentes.
                Tratar erro como vazio faria a tela AFIRMAR que o clube não tem
                plano quando ela só não conseguiu saber — cliente não inventa.
              */}
              {planQuery.state === "loading"
                ? "Lendo o plano…"
                : planQuery.state === "error" || planQuery.state === "offline"
                  ? "Não foi possível ler o plano atual. O que aparece abaixo é rascunho, não o que está valendo."
                  : plan === null
                    ? "Nenhum plano definido nesta temporada."
                    : `Atual: ${plan.name} · ${intensityLabel(plan.intensity)}`}
            </Text>

            <View style={styles.focusGrid}>
              {FOCUS_OPTIONS.map((option) => (
                <Pressable
                  key={option.focus}
                  onPress={() => setDraftFocus(option.focus)}
                  accessibilityRole="button"
                  accessibilityLabel={`Foco ${option.label}`}
                  accessibilityState={{ selected: focus === option.focus }}
                  style={[
                    styles.chip,
                    focus === option.focus && styles.chipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      focus === option.focus && styles.chipTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.loadRow}>
              <Text style={styles.loadLabel}>
                CARGA · {intensityLabel(intensity)} ({intensity})
              </Text>
              <View style={styles.loadButtons}>
                <Pressable
                  onPress={() => setDraftIntensity(clampIntensity(intensity - 10))}
                  accessibilityRole="button"
                  accessibilityLabel="Diminuir carga"
                  accessibilityState={{}}
                  style={styles.loadButton}
                >
                  <Text style={styles.loadButtonText}>−</Text>
                </Pressable>
                <Pressable
                  onPress={() => setDraftIntensity(clampIntensity(intensity + 10))}
                  accessibilityRole="button"
                  accessibilityLabel="Aumentar carga"
                  accessibilityState={{}}
                  style={styles.loadButton}
                >
                  <Text style={styles.loadButtonText}>+</Text>
                </Pressable>
              </View>
            </View>
            {intensity >= 75 ? (
              <Text style={styles.warn}>
                Carga pesada: sobe o risco de lesão no elenco.
              </Text>
            ) : null}
            <Text style={styles.summaryHint}>
              Quem está sob restrição médica entra em RECUPERAÇÃO, não no foco
              do grupo — o domínio recusaria o contrário.
            </Text>

            <Pressable
              onPress={savePlan}
              disabled={!canSave}
              accessibilityRole="button"
              accessibilityLabel="Salvar plano do elenco"
              accessibilityState={{ disabled: !canSave }}
              style={[styles.savePlan, !canSave && styles.actionBusy]}
            >
              <Text style={styles.actionText}>
                {!planReadable
                  ? "SEM LEITURA DO PLANO"
                  : dirty
                    ? "SALVAR PLANO"
                    : "PLANO SALVO"}
              </Text>
            </Pressable>
            {planError !== null ? (
              <Text style={styles.error}>{planError}</Text>
            ) : null}
          </Card>

          <Card>
            <Text style={styles.cardTitle}>CONVERSA COM O ELENCO</Text>
            <Text style={styles.summaryHint}>
              Move a FORMA de todo o grupo de uma vez — não o núcleo.
            </Text>
            <View style={styles.stanceRow}>
              {STANCE_OPTIONS.map((option) => (
                <Pressable
                  key={option.stance}
                  onPress={() => talkToSquad(option.stance)}
                  disabled={actingId !== null}
                  accessibilityRole="button"
                  accessibilityLabel={`${option.label} o elenco`}
                  accessibilityState={{ disabled: actingId !== null }}
                  style={[
                    styles.stance,
                    option.tone === "up" ? styles.stanceUp : styles.stanceDown,
                  ]}
                >
                  <Text style={styles.stanceText}>
                    {option.label.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Card>

          {tracking?.status === CommandTrackingStatus.REJECTED ? (
            <Text style={styles.error}>
              {tracking.errorCode ?? "COMMAND_REJECTED"}
            </Text>
          ) : null}

          {rows.length === 0 ? (
            <Text style={styles.empty}>
              O elenco está vazio — não há ninguém para treinar.
            </Text>
          ) : (
            rows.map((row) => (
              <TrainingCard
                key={row.playerId}
                row={row}
                busy={actingId === row.playerId}
                onStart={() => setPicking(row)}
                onCollect={() => collectSession(row)}
              />
            ))
          )}
        </ScrollView>
      )}

      <Modal
        visible={picking !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setPicking(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>
              FOCO DO TREINO — {picking?.name ?? ""}
            </Text>
            <Text style={styles.modalHint}>
              O menor atributo aparece primeiro: é onde sobra mais espaço para
              crescer.
            </Text>
            <ScrollView style={styles.modalList}>
              {picking === null ? null : attributesOf(picking.playerId).length ===
                0 ? (
                <Text style={styles.empty}>
                  Este jogador não tem grade de atributos na leitura do elenco —
                  não há foco a escolher.
                </Text>
              ) : (
                attributesOf(picking.playerId).map((attr) => (
                  <Pressable
                    key={attr.code}
                    onPress={() => startSession(picking, attr.code)}
                    accessibilityRole="button"
                    accessibilityLabel={`Treinar ${attributeLabel(attr.code)}`}
                    accessibilityState={{}}
                    style={styles.attrRow}
                  >
                    <Text style={styles.attrName}>
                      {attributeLabel(attr.code)}
                    </Text>
                    <Text style={styles.attrValue}>{attr.value}</Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
            <Pressable
              onPress={() => setPicking(null)}
              accessibilityRole="button"
              accessibilityLabel="Cancelar escolha de foco"
              accessibilityState={{}}
              style={styles.modalCancel}
            >
              <Text style={styles.modalCancelText}>CANCELAR</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Summary({
  label,
  value,
  tone,
}: {
  readonly label: string;
  readonly value: number;
  readonly tone: "primary" | "text" | "warning";
}) {
  return (
    <View style={styles.summaryBox}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text
        style={[
          styles.summaryValue,
          tone === "primary" && { color: color.primary },
          tone === "warning" && { color: color.warning },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function TrainingCard({
  row,
  busy,
  onStart,
  onCollect,
}: {
  readonly row: TrainingRow;
  readonly busy: boolean;
  readonly onStart: () => void;
  readonly onCollect: () => void;
}) {
  return (
    <Card>
      <View style={styles.playerRow}>
        <Text style={styles.shirt}>{row.shirtNumber}</Text>
        <Pressable
          onPress={() => router.push(`/elenco/desenvolvimento/${row.playerId}`)}
          accessibilityRole="button"
          accessibilityLabel={`Ver desenvolvimento de ${row.name}`}
          accessibilityState={{}}
          style={styles.playerInfo}
        >
          <Text style={styles.playerName}>{row.name}</Text>
          <Text style={styles.playerMeta}>
            {row.primaryPosition} · {row.overall} · ver desenvolvimento
          </Text>
        </Pressable>

        {row.state === "BLOCKED" ? (
          <Text style={styles.blocked}>{row.blockedLabel}</Text>
        ) : row.state === "TRAINING" && row.session !== null ? (
          <Pressable
            onPress={onCollect}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={`Coletar treino de ${row.name}`}
            accessibilityState={{ disabled: busy }}
            style={[styles.action, styles.actionCollect, busy && styles.actionBusy]}
          >
            <Text style={styles.actionText}>
              {busy ? "…" : "COLETAR"}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={onStart}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={`Treinar ${row.name}`}
            accessibilityState={{ disabled: busy }}
            style={[styles.action, busy && styles.actionBusy]}
          >
            <Text style={styles.actionText}>{busy ? "…" : "TREINAR"}</Text>
          </Pressable>
        )}
      </View>

      {row.session === null ? null : (
        <View style={styles.progressBlock}>
          <Text style={styles.progressLabel}>
            {attributeLabel(row.session.attributeCode)} ·{" "}
            {row.session.elapsedDays}/{row.session.durationDays} dias
            {row.session.complete ? " · completo" : " · parcial"}
          </Text>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.round(
                    (row.session.elapsedDays / row.session.durationDays) * 100,
                  )}%`,
                },
              ]}
            />
          </View>
        </View>
      )}
    </Card>
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
  summary: { flexDirection: "row", gap: space.sm },
  summaryBox: {
    flex: 1,
    backgroundColor: color.backgroundElevated,
    borderRadius: radius.sm,
    padding: space.md,
    gap: 2,
  },
  summaryLabel: {
    color: color.textMuted,
    fontSize: 9,
    fontWeight: fontWeight.bold as "700",
    letterSpacing: 0.3,
  },
  summaryValue: {
    color: color.text,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
  },
  summaryHint: {
    color: color.textMuted,
    fontSize: fontSize.xs,
    marginTop: space.sm,
  },
  error: {
    color: color.danger,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold as "700",
  },
  empty: { color: color.textMuted, fontSize: fontSize.sm },
  playerRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  shirt: {
    color: color.textFaint,
    fontSize: fontSize.md,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
    width: 28,
  },
  playerInfo: { flex: 1, gap: 2 },
  playerName: {
    color: color.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as "700",
  },
  playerMeta: { color: color.textMuted, fontSize: fontSize.xs },
  blocked: {
    color: color.warning,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold as "700",
  },
  action: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
    backgroundColor: color.primary,
  },
  actionCollect: { backgroundColor: color.success },
  actionBusy: { opacity: 0.5 },
  actionText: {
    color: color.background,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold as "700",
  },
  progressBlock: { marginTop: space.md, gap: space.xs },
  progressLabel: { color: color.textMuted, fontSize: fontSize.xs },
  progressTrack: {
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: color.surface,
    overflow: "hidden",
  },
  progressFill: { height: 4, backgroundColor: color.primary },
  cardTitle: {
    color: color.textMuted,
    fontSize: 9,
    fontWeight: fontWeight.bold as "700",
    letterSpacing: 0.3,
    marginBottom: space.xs,
  },
  focusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.xs,
    marginTop: space.sm,
  },
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
  loadRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: space.md,
  },
  loadLabel: {
    color: color.text,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold as "700",
  },
  loadButtons: { flexDirection: "row", gap: space.sm },
  loadButton: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: color.backgroundElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  loadButtonText: {
    color: color.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.black as "800",
  },
  warn: {
    color: color.warning,
    fontSize: fontSize.xs,
    marginTop: space.sm,
  },
  savePlan: {
    marginTop: space.md,
    alignItems: "center",
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    backgroundColor: color.primary,
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
  stanceText: {
    color: color.background,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold as "700",
  },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "#0008" },
  modalSheet: {
    backgroundColor: color.backgroundElevated,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: space.lg,
    gap: space.sm,
    maxHeight: "80%",
  },
  modalTitle: {
    color: color.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
  },
  modalHint: { color: color.textMuted, fontSize: fontSize.xs },
  modalList: { marginVertical: space.sm },
  attrRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  attrName: { color: color.text, fontSize: fontSize.sm },
  attrValue: {
    color: color.textMuted,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as "700",
  },
  modalCancel: { alignItems: "center", paddingVertical: space.md },
  modalCancelText: {
    color: color.textMuted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold as "700",
  },
});
