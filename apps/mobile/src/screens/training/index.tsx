import { useCallback, useEffect, useMemo, useState } from "react";
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

import { AvailabilityFlag } from "@/components/availability-flag";
import { Card } from "@/components/card";
import { Icon } from "@/components/icon";
import { PositionBadge, positionGroupTint } from "@/components/position-badge";
import {
  PlayerSkillCard,
  type PlayerSkillCardData,
} from "@/components/player-skill-card";
import { Refresh } from "@/components/refresh";
import { ScreenStatePanel } from "@/components/screen-state-panel";
import { useToast } from "@/components/toast";
import { commandFeedback } from "@/lib/command-feedback";
import {
  selectManagedClub,
  type ClubPortfolioProjection,
} from "@/lib/club-projection";
import {
  submitTrackedCommand,
  type TrackedCommandResult,
} from "@/lib/command-orchestrator";
import {
  commandIdempotencyKey,
  onDay,
  onEntity,
  onRevision,
} from "@/lib/idempotency";
import { deriveScreenState } from "@/lib/screen-state";
import { useSession } from "@/lib/session";
import { useRequiredWorldId, useWorldQuery } from "@/lib/world";
import {
  deriveOnboardingStep,
  type MobileIdentityProjection,
} from "@/screens/onboarding/onboarding-model";
import {
  FORMATION_KEYS,
  assignToFormation,
  type FormationKey,
} from "@/screens/squad/formations";
import type { PositionGroup, SquadPlayer } from "@/screens/squad/squad-data";
import {
  buildTalkToSquadPayload,
  STANCE_OPTIONS,
  talkIdempotencyKey,
  type TalkStance,
} from "@/screens/talk/talk-model";
import { availabilityBadge } from "@/screens/roster-list/roster-model";
import {
  cohesionBadge,
  cohesionMatchModifier,
  formationTrainState,
} from "@/screens/training-plan/cohesion-model";
import {
  FOCUS_OPTIONS,
  buildSetPlanPayload,
  clampIntensity,
  intensityLabel,
  type PlanFocus,
} from "@/screens/training-plan/training-plan-model";
import {
  countdownProgressPercent,
  formatCountdown,
  sessionCountdown,
} from "@/screens/training-session/session-countdown";
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
  readonly potential: number;
  readonly age: number;
  readonly availability: string;
  readonly groups?: {
    readonly technical: number;
    readonly physical: number;
    readonly mental: number;
    readonly goalkeeping: number | null;
  } | null;
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
  readonly elapsedDays: number;
  /** Projeção do ganho (R-221): o servidor computa com a fórmula da coleta. */
  readonly attributeCurrentValue: number | null;
  readonly projectedGainPoints: number;
  readonly projectedValue: number | null;
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

interface WorldClockProjection {
  readonly realSecondsPerDay: number | null;
  readonly nextTickAt: string | null;
}

interface GroupSessionProjection {
  readonly session: {
    readonly formation: string;
    readonly participantIds: readonly string[];
    readonly startDate: string;
    readonly durationDays: number;
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

/** Setor de cada posição — para o tint da PositionBadge, como no elenco. */
const SECTOR: Readonly<Record<string, "GOL" | "DEF" | "MEI" | "ATA">> = {
  GK: "GOL",
  CB: "DEF", LB: "DEF", RB: "DEF", LWB: "DEF", RWB: "DEF",
  CDM: "MEI", CM: "MEI", CAM: "MEI", LM: "MEI", RM: "MEI",
  LW: "ATA", RW: "ATA", ST: "ATA", CF: "ATA",
};
const sectorOf = (code: string): "GOL" | "DEF" | "MEI" | "ATA" =>
  SECTOR[code] ?? "MEI";

/**
 * Treino (M-TRAINING) — o elenco e o estado de treino de cada jogador.
 *
 * Toda a decisão (estado da sessão, progresso, payload) vive em
 * `training-session-model.ts` e é testada lá. Aqui só renderiza e despacha.
 */
export function Training() {
  const { session, status, client, contractVersion } = useSession();
  const worldId = useRequiredWorldId();
  const toast = useToast();
  const [picking, setPicking] = useState<TrainingRow | null>(null);
  const [inspectId, setInspectId] = useState<string | null>(null);
  const [formationOpen, setFormationOpen] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [tracking, setTracking] = useState<TrackedCommandResult | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

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
  // A BASE (C8): os jovens também podem treinar (individual e em grupo) — o
  // domínio de treino aceita qualquer playerId APTO, sem filtro de categoria.
  // Aditiva: se a leitura da base falhar, a tela mostra só o profissional (não
  // inventa). A query `youth` tem a MESMA forma da `roster`.
  const youthQuery = useWorldQuery<RosterProjection>(
    managedClub === null ? null : "youth",
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
  // O relógio do mundo alimenta a contagem regressiva das sessões.
  const clockQuery = useWorldQuery<WorldClockProjection>("world-clock");
  // Relógio de parede que tica a cada segundo — só efeito de view (a lógica da
  // contagem é pura, em session-countdown). Ligado só quando há sessão ativa.
  const anyTraining = (sessionsQuery.data?.sessions.length ?? 0) > 0;
  const [nowMs, setNowMs] = useState(() => Date.parse(new Date().toISOString()));
  useEffect(() => {
    if (!anyTraining) return;
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [anyTraining]);
  const nowIso = new Date(nowMs).toISOString();
  // A escalação corrente (R-220 Fase 1): formação + titulares (quem participa do
  // treino da EQUIPE). Sem ela o backend recusaria com NO_LINEUP_TO_TRAIN.
  const lineupQuery = useWorldQuery<{
    lineup: {
      readonly formation: string;
      readonly version: number;
      readonly starters: readonly {
        readonly playerId: string;
        readonly slotPosition: string;
      }[];
    } | null;
  }>(
    managedClub === null ? null : "lineup",
    managedClub === null ? undefined : { clubId: managedClub.id },
  );
  // "Sem escalação" e "não consegui ler a escalação" são coisas diferentes: só
  // a leitura CONCLUÍDA autoriza afirmar que não há escalação (senão a tela
  // mandaria montar uma que talvez já exista).
  const lineupReadable =
    lineupQuery.state === "ready" || lineupQuery.state === "empty";
  const lineup = lineupQuery.data?.lineup ?? null;
  const hasLineup = lineupReadable && lineup !== null;
  const trainState = formationTrainState({ lineupReadable, hasLineup });
  // Quem está no treino da EQUIPE (titulares) NÃO pode treinar individualmente.
  const starterIds = useMemo(
    () => new Set((lineup?.starters ?? []).map((s) => s.playerId)),
    [lineup],
  );
  // O POOL de treino: profissional + base juntos. Treino (individual e grupo)
  // opera sobre os dois; a formação/plano coletivo seguem só o profissional.
  const allPlayers = useMemo(
    () => [
      ...(rosterQuery.data?.players ?? []),
      ...(youthQuery.data?.players ?? []),
    ],
    [rosterQuery.data, youthQuery.data],
  );
  // Quais ids são da BASE — para marcar a linha/opção com o selo "BASE".
  const youthIds = useMemo(
    () => new Set((youthQuery.data?.players ?? []).map((p) => p.playerId)),
    [youthQuery.data],
  );
  // Quem está APTO — o único conjunto que o backend aceita no treino em grupo
  // (senão recusa com PLAYER_NOT_AVAILABLE). Lesionado/suspenso/em treino fora.
  const availableIds = useMemo(
    () =>
      new Set(
        allPlayers
          .filter((p) => p.availability === "AVAILABLE")
          .map((p) => p.playerId),
      ),
    [allPlayers],
  );
  // A sessão de treino em GRUPO ativa (R-220.2): cronometrada, com participantes.
  const groupQuery = useWorldQuery<GroupSessionProjection>(
    managedClub === null ? null : "group-training-session",
    managedClub === null ? undefined : { clubId: managedClub.id },
  );
  const groupSession = groupQuery.data?.session ?? null;
  // Rascunho dos participantes do PRÓXIMO treino em grupo. Default = titulares
  // APTOS: um titular lesionado/suspenso não pode entrar, então nunca é o padrão
  // (era o que fazia o start recusar em silêncio antes de o usuário poder mexer).
  const defaultParticipants = useMemo(
    () => new Set([...starterIds].filter((id) => availableIds.has(id))),
    [starterIds, availableIds],
  );
  const [groupDraft, setGroupDraft] = useState<Set<string> | null>(null);
  const groupParticipants = groupDraft ?? defaultParticipants;


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
        allPlayers,
        sessionsQuery.data?.sessions ?? [],
        worldDate,
      ),
    [allPlayers, sessionsQuery.data, worldDate],
  );
  const summary = useMemo(() => summarizeTraining(rows), [rows]);

  const attributesOf = useCallback(
    (playerId: string): readonly { code: string; value: number }[] => {
      const player = allPlayers.find((p) => p.playerId === playerId);
      const grid = player?.attributes ?? null;
      if (grid === null) return [];
      return Object.entries(grid)
        .filter((entry): entry is [string, number] => typeof entry[1] === "number")
        .map(([code, value]) => ({ code, value }))
        // Menor primeiro: é onde sobra mais espaço para crescer.
        .sort((a, b) => a.value - b.value);
    },
    [allPlayers],
  );

  const refresh = useCallback(() => {
    clubQuery.refetch();
    rosterQuery.refetch();
    youthQuery.refetch();
    sessionsQuery.refetch();
    planQuery.refetch();
    lineupQuery.refetch();
    groupQuery.refetch();
  }, [
    clubQuery.refetch,
    rosterQuery.refetch,
    youthQuery.refetch,
    sessionsQuery.refetch,
    planQuery.refetch,
    lineupQuery.refetch,
    groupQuery.refetch,
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
      /** O que o toast diz quando dá certo (contextual: iniciar vs coletar). */
      successText: string,
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
        // Toast claro em TODO desfecho — o jogador nunca fica sem saber o que
        // aconteceu. A mensagem já vem traduzida (nada de código cru na tela).
        const fb = commandFeedback(result, successText);
        if (fb !== null) toast.show(fb);
        if (
          result.status === CommandTrackingStatus.ACCEPTED ||
          result.status === CommandTrackingStatus.APPLIED
        ) {
          setPicking(null);
          rosterQuery.refetch();
          youthQuery.refetch();
          sessionsQuery.refetch();
        }
      });
    },
    [
      managedClub,
      client,
      contractVersion,
      worldId,
      toast,
      rosterQuery.refetch,
      youthQuery.refetch,
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
      if ("error" in payload) {
        toast.show({ tone: "error", text: "Escolha um atributo para treinar." });
        return;
      }
      if (worldDate === "") {
        toast.show({
          tone: "error",
          text: "Sem a data do mundo não dá para iniciar o treino. Recarregue.",
        });
        return;
      }
      // Uma sessão por jogador por DIA lógico. Amanhã ele treina de novo.
      dispatch(
        "training:start-session",
        row.playerId,
        { ...payload },
        commandIdempotencyKey({
          commandType: "training:start-session",
          target: `${row.playerId}:${attributeCode}`,
          occasion: onDay(worldDate),
        }),
        `Treino iniciado: ${row.name}.`,
      );
    },
    [managedClub, dispatch, worldDate, toast],
  );

  const collectSession = useCallback(
    (row: TrainingRow) => {
      // Escopo = a SESSÃO. Coletar duas vezes a mesma sessão é o mesmo efeito;
      // a sessão da semana que vem é outra ocasião e tem que valer.
      const sessionId =
        sessionsQuery.data?.sessions.find((s) => s.playerId === row.playerId)?.id ??
        null;
      if (sessionId === null) {
        toast.show({
          tone: "error",
          text: "Sessão não encontrada. Recarregue antes de coletar.",
        });
        return;
      }
      dispatch(
        "training:collect-session",
        row.playerId,
        { playerId: row.playerId },
        commandIdempotencyKey({
          commandType: "training:collect-session",
          target: row.playerId,
          occasion: onEntity(sessionId),
        }),
        `${row.name} liberado do treino e de volta ao elenco.`,
      );
    },
    [dispatch, sessionsQuery.data, toast],
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
      toast.show({
        tone: "error",
        text:
          payload.error === "NO_PLAYERS"
            ? "Um plano sem jogador não treina ninguém."
            : "O plano precisa de um nome.",
      });
      return;
    }
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
    const idempotencyKey = commandIdempotencyKey({
      commandType: "training:set-plan",
      target: managedClub.id,
      occasion: onRevision(plan?.version ?? 0, focus, intensity),
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
      commandType: "training:set-plan",
      worldId,
      payload: { ...payload },
      idempotencyKey,
      correlationId: `mobile:${idempotencyKey}`,
    }).then((result) => {
      setTracking(result);
      const fb = commandFeedback(result, "Plano do elenco salvo.");
      if (fb !== null) toast.show(fb);
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


  /**
   * Muda a formação da equipe (item 5). Reusa `assignToFormation` do elenco para
   * alocar os melhores jogadores nos slots, e persiste com `tactics:set-lineup`.
   */
  const changeFormation = useCallback(
    (key: FormationKey) => {
      if (managedClub === null || client === null || contractVersion === null) {
        setFormationOpen(false);
        return;
      }
      const assignable: SquadPlayer[] = (rosterQuery.data?.players ?? []).map(
        (p) =>
          ({
            id: p.playerId,
            group: sectorOf(p.primaryPosition) as PositionGroup,
            ovr: p.overall,
          }) as SquadPlayer,
      );
      const starters = assignToFormation(assignable, key);
      if (starters.length === 0) {
        toast.show({
          tone: "error",
          text: "Elenco vazio — não há como montar a formação.",
        });
        setFormationOpen(false);
        return;
      }
      const idempotencyKey = commandIdempotencyKey({
        commandType: "tactics:set-lineup",
        target: managedClub.id,
        occasion: onRevision(lineup?.version ?? 0, key),
      });
      setFormationOpen(false);
      void submitTrackedCommand(client, {
        clientContractVersion: "v1",
        serverContractVersion: contractVersion,
        commandType: "tactics:set-lineup",
        worldId,
        payload: {
          clubId: managedClub.id,
          formation: key,
          starters,
          bench: [],
          expectedVersion: lineup?.version ?? null,
        },
        idempotencyKey,
        correlationId: `mobile:${idempotencyKey}`,
      }).then((result) => {
        const fb = commandFeedback(result, `Formação ${key} montada.`);
        if (fb !== null) toast.show(fb);
        if (
          result.status === CommandTrackingStatus.ACCEPTED ||
          result.status === CommandTrackingStatus.APPLIED
        ) {
          lineupQuery.refetch();
          clubQuery.refetch();
        }
      });
    },
    [
      managedClub,
      client,
      contractVersion,
      worldId,
      rosterQuery.data,
      lineup,
      toast,
      lineupQuery.refetch,
      clubQuery.refetch,
    ],
  );

  /** Inicia o treino em GRUPO cronometrado (R-220.2) com os participantes escolhidos. */
  const startGroupTraining = useCallback(() => {
    if (managedClub === null || client === null || contractVersion === null) {
      return;
    }
    if (lineup === null) {
      toast.show({ tone: "error", text: "Monte a formação antes de treinar em grupo." });
      return;
    }
    // Filtro defensivo: só APTOS vão ao backend. Mesmo que um indisponível tenha
    // sobrado no rascunho, ele não pode entrar — o start recusaria o lote todo.
    const ids = [...groupParticipants].filter((id) => availableIds.has(id));
    if (ids.length === 0) {
      toast.show({ tone: "error", text: "Escolha ao menos um jogador APTO para o grupo." });
      return;
    }
    if (worldDate === "") {
      toast.show({ tone: "error", text: "Sem a data do mundo não dá para iniciar. Recarregue." });
      return;
    }
    const idempotencyKey = commandIdempotencyKey({
      commandType: "training:start-group-session",
      target: managedClub.id,
      occasion: onDay(worldDate),
    });
    void submitTrackedCommand(client, {
      clientContractVersion: "v1",
      serverContractVersion: contractVersion,
      commandType: "training:start-group-session",
      worldId,
      payload: { clubId: managedClub.id, formation: lineup.formation, participantIds: ids },
      idempotencyKey,
      correlationId: `mobile:${idempotencyKey}`,
    }).then((result) => {
      const fb = commandFeedback(result, "Treino em grupo iniciado.");
      if (fb !== null) toast.show(fb);
      if (
        result.status === CommandTrackingStatus.ACCEPTED ||
        result.status === CommandTrackingStatus.APPLIED
      ) {
        setGroupDraft(null);
        groupQuery.refetch();
        rosterQuery.refetch();
      }
    });
  }, [
    managedClub,
    client,
    contractVersion,
    worldId,
    worldDate,
    lineup,
    groupParticipants,
    availableIds,
    toast,
    groupQuery.refetch,
    rosterQuery.refetch,
  ]);

  /** Coleta o treino em grupo — sobe o entrosamento e libera os participantes. */
  const collectGroupTraining = useCallback(() => {
    if (managedClub === null || client === null || contractVersion === null) {
      return;
    }
    // Ocasião = a sessão de grupo (identificada pelo início). Coletar de novo a
    // mesma sessão dedupe; a próxima sessão é outra ocasião.
    const idempotencyKey = commandIdempotencyKey({
      commandType: "training:collect-group-session",
      target: managedClub.id,
      occasion: onEntity(`${managedClub.id}:${groupSession?.startDate ?? "none"}`),
    });
    void submitTrackedCommand(client, {
      clientContractVersion: "v1",
      serverContractVersion: contractVersion,
      commandType: "training:collect-group-session",
      worldId,
      payload: { clubId: managedClub.id },
      idempotencyKey,
      correlationId: `mobile:${idempotencyKey}`,
    }).then((result) => {
      const fb = commandFeedback(result, "Treino em grupo coletado — entrosamento subiu.");
      if (fb !== null) toast.show(fb);
      if (
        result.status === CommandTrackingStatus.ACCEPTED ||
        result.status === CommandTrackingStatus.APPLIED
      ) {
        groupQuery.refetch();
        rosterQuery.refetch();
        clubQuery.refetch();
      }
    });
  }, [
    managedClub,
    client,
    contractVersion,
    worldId,
    worldDate,
    groupSession,
    toast,
    groupQuery.refetch,
    rosterQuery.refetch,
    clubQuery.refetch,
  ]);

  /** Conversa com o ELENCO — move a forma de todo mundo de uma vez. */
  const talkToSquad = useCallback(
    (stance: TalkStance) => {
      if (managedClub === null || client === null || contractVersion === null) {
        return;
      }
      const commandType = "morale:talk-to-squad";
      if (worldDate === "") {
        toast.show({
          tone: "error",
          text: "Sem a data do mundo não dá para conversar. Recarregue.",
        });
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
        const fb = commandFeedback(result, "Conversa com o elenco registrada.");
        if (fb !== null) toast.show(fb);
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

  // NÃO alimentamos `command` no estado de tela: um command ACCEPTED é
  // não-terminal (fica pendente até um evento confirmar o efeito), e este app
  // não tem essa confirmação — então gatear a TELA INTEIRA em "processing" pelo
  // status do command a prendia em "processando…" para sempre depois do TREINAR.
  // O feedback do command é INLINE (spinner no botão via actingId, texto de erro
  // em REJECTED), como na tela do Clube. O efeito oficial chega pelo refetch.
  const screenState = deriveScreenState({
    session: status,
    hasCachedData:
      clubQuery.isStale || rosterQuery.isStale || sessionsQuery.isStale,
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
              {summary.training > 0
                ? `${summary.training} em treino — o ganho é aplicado e cada um volta ao elenco sozinho na virada do dia.`
                : "Nenhuma sessão em andamento."}
            </Text>
          </Card>

          {/* Bloco da EQUIPE — treino que vale para o grupo todo. */}
          <View style={styles.sectionHeaderRow}>
            <Icon name="people" size={16} color={color.primary} />
            <Text style={styles.sectionHeader}>TREINO DA EQUIPE</Text>
          </View>

          {/* ENTROSAMENTO (R-220 Fase 3): treinar a formação entrosa o grupo. */}
          {managedClub !== null
            ? (() => {
                const badge = cohesionBadge(managedClub.cohesion);
                const mod = cohesionMatchModifier(managedClub.cohesion);
                return (
                  <Card>
                    <Text style={styles.cardTitle}>ENTROSAMENTO DO TIME</Text>
                    <View style={styles.cohesionRow}>
                      <Text
                        style={[
                          styles.cohesionValue,
                          badge.tone === "up" && { color: color.success },
                          badge.tone === "down" && { color: color.warning },
                        ]}
                      >
                        {badge.value}
                      </Text>
                      <View style={styles.cohesionInfo}>
                        <Text style={styles.cohesionLabel}>{badge.label}</Text>
                        <Text style={styles.summaryHint}>
                          Na partida: {mod >= 0 ? `+${mod}` : mod} de força
                          coletiva.
                        </Text>
                      </View>
                    </View>
                    {/* Barra do entrosamento do time (0..100). */}
                    <View style={styles.cohTrack}>
                      <View
                        style={[
                          styles.cohFill,
                          { width: `${badge.value}%` },
                          badge.tone === "down" && { backgroundColor: color.warning },
                          badge.tone === "up" && { backgroundColor: color.success },
                        ]}
                      />
                    </View>

                    {groupSession !== null
                      ? (() => {
                          // SESSÃO EM ANDAMENTO: barra de TEMPO + coletar.
                          const cd = sessionCountdown({
                            realSecondsPerDay:
                              clockQuery.data?.realSecondsPerDay ?? null,
                            nextTickAt: clockQuery.data?.nextTickAt ?? null,
                            elapsedDays: Math.min(
                              Math.max(
                                0,
                                Math.floor(
                                  (Date.parse(`${worldDate || groupSession.startDate}T00:00:00Z`) -
                                    Date.parse(`${groupSession.startDate}T00:00:00Z`)) /
                                    86_400_000,
                                ),
                              ),
                              groupSession.durationDays,
                            ),
                            durationDays: groupSession.durationDays,
                            nowIso,
                          });
                          const pct = countdownProgressPercent({
                            secondsRemaining: cd.secondsRemaining,
                            elapsedDays: cd.daysRemaining
                              ? groupSession.durationDays - cd.daysRemaining
                              : groupSession.durationDays,
                            durationDays: groupSession.durationDays,
                            realSecondsPerDay:
                              clockQuery.data?.realSecondsPerDay ?? null,
                          });
                          const collectable =
                            cd.complete || cd.daysRemaining < groupSession.durationDays;
                          const names = groupSession.participantIds.map(
                            (id) =>
                              allPlayers.find((p) => p.playerId === id)?.name ??
                              "—",
                          );
                          return (
                            <View style={styles.teamBlock}>
                              <View style={styles.teamHeadRow}>
                                <Text style={styles.teamFormation}>
                                  {groupSession.formation}
                                </Text>
                                <Text style={styles.rowStatusTeam}>
                                  ● treinando
                                </Text>
                              </View>
                              <Text style={styles.cdTimeLarge}>
                                {cd.complete
                                  ? "completo — colete o entrosamento"
                                  : cd.secondsRemaining === null
                                    ? `faltam ${cd.daysRemaining} dia(s) lógicos`
                                    : `faltam ${formatCountdown(cd.secondsRemaining)} (tempo real)`}
                              </Text>
                              <View style={styles.cohTrack}>
                                <View
                                  style={[
                                    styles.cohFill,
                                    { width: `${cd.complete ? 100 : pct}%` },
                                    cd.complete && { backgroundColor: color.success },
                                  ]}
                                />
                              </View>
                              <Text style={styles.summaryHint}>
                                {names.length} participantes: {names.join(", ")}
                              </Text>
                              <Pressable
                                onPress={collectGroupTraining}
                                disabled={!collectable}
                                accessibilityRole="button"
                                accessibilityLabel="Coletar treino em grupo"
                                accessibilityState={{ disabled: !collectable }}
                                style={[
                                  styles.savePlan,
                                  { backgroundColor: color.success },
                                  !collectable && styles.actionBusy,
                                ]}
                              >
                                <Text style={styles.actionText}>
                                  {collectable
                                    ? "COLETAR ENTROSAMENTO"
                                    : "AINDA NÃO RENDEU"}
                                </Text>
                              </Pressable>
                            </View>
                          );
                        })()
                      : (() => {
                          // SEM SESSÃO: montar e iniciar o treino em grupo.
                          const draftNames = [...groupParticipants].map(
                            (id) =>
                              allPlayers.find((p) => p.playerId === id)?.name ??
                              "—",
                          );
                          return (
                            <View style={styles.teamBlock}>
                              <View style={styles.teamHeadRow}>
                                <Text style={styles.teamFormation}>
                                  {lineup?.formation ?? "—"}
                                </Text>
                                <Pressable
                                  onPress={() => setFormationOpen(true)}
                                  accessibilityRole="button"
                                  accessibilityLabel="Mudar a formação"
                                  accessibilityState={{}}
                                  style={styles.changeFormationBtn}
                                >
                                  <Icon name="grid" size={13} color={color.primary} />
                                  <Text style={styles.changeFormationText}>
                                    MUDAR FORMAÇÃO
                                  </Text>
                                </Pressable>
                              </View>
                              <Pressable
                                onPress={() => {
                                  setGroupDraft(new Set(defaultParticipants));
                                  setParticipantsOpen(true);
                                }}
                                accessibilityRole="button"
                                accessibilityLabel="Escolher participantes"
                                accessibilityState={{}}
                              >
                                <Text style={styles.summaryHint}>
                                  {groupParticipants.size} participantes (toque para
                                  escolher): {draftNames.slice(0, 4).join(", ")}
                                  {draftNames.length > 4 ? "…" : ""}
                                </Text>
                              </Pressable>
                              <Pressable
                                onPress={startGroupTraining}
                                disabled={!hasLineup || groupParticipants.size === 0}
                                accessibilityRole="button"
                                accessibilityLabel="Iniciar treino em grupo"
                                accessibilityState={{
                                  disabled: !hasLineup || groupParticipants.size === 0,
                                }}
                                style={[
                                  styles.savePlan,
                                  (!hasLineup || groupParticipants.size === 0) &&
                                    styles.actionBusy,
                                ]}
                              >
                                <Text style={styles.actionText}>
                                  {hasLineup
                                    ? "INICIAR TREINO EM GRUPO"
                                    : "MONTE A ESCALAÇÃO PRIMEIRO"}
                                </Text>
                              </Pressable>
                              {!hasLineup ? (
                                <Pressable
                                  onPress={() => setFormationOpen(true)}
                                  accessibilityRole="button"
                                  accessibilityLabel="Escolher formação"
                                  accessibilityState={{}}
                                >
                                  <Text style={[styles.summaryHint, { color: color.primary }]}>
                                    Toque para escolher a formação e montar a escalação.
                                  </Text>
                                </Pressable>
                              ) : null}
                            </View>
                          );
                        })()}
                  </Card>
                );
              })()
            : null}

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

          {/* Bloco INDIVIDUAL — uma sessão por jogador. */}
          <View style={styles.sectionHeaderRow}>
            <Icon name="person" size={16} color={color.primary} />
            <Text style={styles.sectionHeader}>TREINO INDIVIDUAL</Text>
          </View>

          {/* Listagem PADRÃO — mesma row do elenco: camisa, posição, nome/idade,
              overall + status do treino. Tocar abre o card, onde treina/coleta. */}
          <Card>
            {rows.length === 0 ? (
              <Text style={styles.empty}>
                O elenco está vazio — não há ninguém para treinar.
              </Text>
            ) : (
              rows.map((row, i) => (
                <Pressable
                  key={row.playerId}
                  onPress={() => setInspectId(row.playerId)}
                  accessibilityRole="button"
                  accessibilityLabel={`Ver card de ${row.name}`}
                  accessibilityState={{}}
                  style={[styles.row, i === 0 && styles.rowFirst]}
                >
                  <Text style={styles.shirt}>{row.shirtNumber}</Text>
                  <PositionBadge
                    label={row.primaryPosition}
                    tint={positionGroupTint(sectorOf(row.primaryPosition))}
                  />
                  <View style={styles.info}>
                    <View style={styles.nameRow}>
                      <Text style={styles.name} numberOfLines={1}>
                        {row.name}
                      </Text>
                      {youthIds.has(row.playerId) ? (
                        <Text style={styles.baseTag}>BASE</Text>
                      ) : null}
                      <AvailabilityFlag availability={row.availability} />
                    </View>
                    {row.state === "TRAINING" && row.session !== null ? (
                      (() => {
                        const cd = sessionCountdown({
                          realSecondsPerDay:
                            clockQuery.data?.realSecondsPerDay ?? null,
                          nextTickAt: clockQuery.data?.nextTickAt ?? null,
                          elapsedDays: row.session.elapsedDays,
                          durationDays: row.session.durationDays,
                          nowIso,
                        });
                        const pct = countdownProgressPercent({
                          secondsRemaining: cd.secondsRemaining,
                          elapsedDays: row.session.elapsedDays,
                          durationDays: row.session.durationDays,
                          realSecondsPerDay:
                            clockQuery.data?.realSecondsPerDay ?? null,
                        });
                        // Progressiva: a barra mostra o que JÁ PASSOU do treino
                        // e enche com o tempo (0% → 100% cheia ao completar).
                        const progress = cd.complete ? 100 : pct;
                        // Cor da posição do jogador — a faixa cinza sumia no card
                        // cinza. Faixa esmaecida, regressão sólida na mesma cor.
                        const tint = positionGroupTint(
                          sectorOf(row.primaryPosition),
                        );
                        return (
                          <>
                            <Text style={styles.meta} numberOfLines={1}>
                              Treinando{" "}
                              <Text style={styles.metaSkill}>
                                {attributeLabel(row.session.attributeCode)}
                              </Text>
                            </Text>
                            {/* Tempo ACIMA da barra. Na virada do dia o jogador é
                                liberado sozinho, com o ganho aplicado. */}
                            <Text style={styles.cdTime} numberOfLines={1}>
                              {cd.complete
                                ? "pronto — vira apto na virada"
                                : cd.secondsRemaining === null
                                  ? `apto em ${cd.daysRemaining} dia(s)`
                                  : `apto em ${formatCountdown(cd.secondsRemaining)}`}
                            </Text>
                            {/* Faixa 100% (cor da posição, esmaecida); progresso
                                em cima, sólido, enchendo até o fim do treino. */}
                            <View
                              style={[styles.cdTrack, { backgroundColor: `${tint}33` }]}
                            >
                              <View
                                style={[
                                  styles.cdFill,
                                  { width: `${progress}%`, backgroundColor: tint },
                                ]}
                              />
                            </View>
                          </>
                        );
                      })()
                    ) : (
                      <Text style={styles.meta} numberOfLines={1}>
                        {row.state === "BLOCKED"
                          ? (row.blockedLabel ?? "Indisponível")
                          : starterIds.has(row.playerId)
                            ? "No treino da equipe"
                            : "Disponível"}
                      </Text>
                    )}
                  </View>
                  {row.state === "TRAINING" ? (
                    <Text style={styles.rowStatusTraining}>●</Text>
                  ) : row.state === "BLOCKED" ? (
                    <Text style={styles.rowStatusBlocked}>●</Text>
                  ) : starterIds.has(row.playerId) ? (
                    <Text style={styles.rowStatusTeam}>●</Text>
                  ) : null}
                  <Text style={styles.ovr}>{row.overall}</Text>
                </Pressable>
              ))
            )}
          </Card>
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

      {/* Card do jogador (o MESMO PlayerSkillCard do elenco/mercado) + a projeção
          do treino: pontuação atual → onde ele chega pelo tempo já treinado. */}
      <Modal
        visible={inspectId !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setInspectId(null)}
      >
        {(() => {
          const player =
            allPlayers.find((p) => p.playerId === inspectId) ?? null;
          const row = rows.find((r) => r.playerId === inspectId) ?? null;
          const session = row?.session ?? null;
          const busy = actingId === inspectId;
          return (
            <View style={styles.inspectRoot}>
              {/* Backdrop SEPARADO (absoluto): fecha ao tocar fora. Não embrulha
                  o card, senão captura o swipe e o slide do card não roda. */}
              <Pressable
                style={styles.inspectBackdrop}
                onPress={() => setInspectId(null)}
                accessibilityRole="button"
                accessibilityLabel="Fechar"
                accessibilityState={{}}
              />
              <View style={styles.inspectWrap} pointerEvents="box-none">
                <ScrollView
                  style={styles.inspectScroll}
                  contentContainerStyle={styles.inspectCard}
                  showsVerticalScrollIndicator={false}
                >
                  {player === null ? (
                    <Text style={styles.empty}>Jogador não encontrado.</Text>
                  ) : (
                    <>
                      <PlayerSkillCard
                        data={
                          {
                            name: player.name,
                            number: player.shirtNumber,
                            position: player.primaryPosition,
                            positionTint: positionGroupTint(
                              sectorOf(player.primaryPosition),
                            ),
                            age: player.age,
                            ovr: player.overall,
                            pot: player.potential,
                            groups: player.groups ?? null,
                            attributes: player.attributes ?? null,
                          } satisfies PlayerSkillCardData
                        }
                      />

                      {session !== null && session.projectedValue !== null ? (
                        <View style={styles.projectionBox}>
                          <Text style={styles.cardTitle}>
                            TREINANDO · {attributeLabel(session.attributeCode)}
                          </Text>
                          <View style={styles.projectionRow}>
                            <Text style={styles.projCurrent}>
                              {session.attributeCurrentValue}
                            </Text>
                            <Icon
                              name="arrow-forward"
                              size={18}
                              color={color.textMuted}
                            />
                            <Text style={styles.projTarget}>
                              {session.projectedValue}
                            </Text>
                            <Text style={styles.projDelta}>
                              {session.projectedGainPoints > 0
                                ? `+${session.projectedGainPoints}`
                                : "sem ganho ainda"}
                            </Text>
                          </View>
                          {(() => {
                            const cd = sessionCountdown({
                              realSecondsPerDay:
                                clockQuery.data?.realSecondsPerDay ?? null,
                              nextTickAt: clockQuery.data?.nextTickAt ?? null,
                              elapsedDays: session.elapsedDays,
                              durationDays: session.durationDays,
                              nowIso,
                            });
                            const pct = countdownProgressPercent({
                              secondsRemaining: cd.secondsRemaining,
                              elapsedDays: session.elapsedDays,
                              durationDays: session.durationDays,
                              realSecondsPerDay:
                                clockQuery.data?.realSecondsPerDay ?? null,
                            });
                            const progress = cd.complete ? 100 : pct;
                            const tint = positionGroupTint(
                              sectorOf(player.primaryPosition),
                            );
                            return (
                              <>
                                {/* Tempo ACIMA da barra — conta até a virada. */}
                                <Text style={styles.cdTimeLarge}>
                                  {cd.complete
                                    ? "pronto — vira apto na virada do dia"
                                    : cd.secondsRemaining === null
                                      ? `apto em ${cd.daysRemaining} dia(s) lógicos`
                                      : `apto em ${formatCountdown(cd.secondsRemaining)} (tempo real)`}
                                </Text>
                                {/* Faixa 100% (cor da posição, esmaecida);
                                    progresso em cima, sólido, enchendo até a virada. */}
                                <View
                                  style={[
                                    styles.cdTrackLarge,
                                    { backgroundColor: `${tint}33` },
                                  ]}
                                >
                                  <View
                                    style={[
                                      styles.cdFill,
                                      {
                                        width: `${progress}%`,
                                        backgroundColor: tint,
                                      },
                                    ]}
                                  />
                                </View>
                                <Text style={styles.summaryHint}>
                                  Na virada do dia lógico o ganho é aplicado e ele
                                  volta ao elenco sozinho — não precisa coletar.
                                </Text>
                              </>
                            );
                          })()}
                        </View>
                      ) : session !== null ? (
                        <Text style={styles.summaryHint}>
                          Treinando {attributeLabel(session.attributeCode)} ·{" "}
                          {session.elapsedDays}/{session.durationDays} dias.
                        </Text>
                      ) : row !== null && row.state === "BLOCKED" ? (
                        <Text style={styles.summaryHint}>
                          {row.blockedLabel} — não pode treinar agora.
                        </Text>
                      ) : (
                        <Text style={styles.summaryHint}>
                          Sem treino ativo. Inicie uma sessão abaixo.
                        </Text>
                      )}

                      {/* AÇÃO no card. Sob o modelo de 1 dia, o ganho vem na
                          virada; coletar ANTES só serve para liberar já — e aí
                          perde o ganho do dia. Por isso o rótulo é honesto. */}
                      {row !== null && row.state === "TRAINING" ? (
                        <>
                          <Pressable
                            onPress={() => collectSession(row)}
                            disabled={busy}
                            accessibilityRole="button"
                            accessibilityLabel={`Liberar ${row.name} do treino agora`}
                            accessibilityState={{ disabled: busy }}
                            style={[
                              styles.cardAction,
                              styles.cardActionCollect,
                              busy && styles.actionBusy,
                            ]}
                          >
                            <Text style={styles.cardActionText}>
                              {busy ? "…" : "LIBERAR AGORA"}
                            </Text>
                          </Pressable>
                          <Text style={styles.summaryHint}>
                            Libera na hora, mas perde o ganho deste dia (ele viria
                            na virada). Deixe treinando para o ganho valer.
                          </Text>
                        </>
                      ) : row !== null &&
                        row.state === "IDLE" &&
                        starterIds.has(row.playerId) ? (
                        // Titular está no treino da EQUIPE — sem individual.
                        <Text style={styles.summaryHint}>
                          Está no treino da equipe (titular) — não pode treinar
                          individualmente. Tire-o da escalação para liberar.
                        </Text>
                      ) : row !== null && row.state === "IDLE" ? (
                        <Pressable
                          onPress={() => {
                            setInspectId(null);
                            setPicking(row);
                          }}
                          disabled={busy}
                          accessibilityRole="button"
                          accessibilityLabel={`Treinar ${row.name}`}
                          accessibilityState={{ disabled: busy }}
                          style={[styles.cardAction, busy && styles.actionBusy]}
                        >
                          <Text style={styles.cardActionText}>
                            {busy ? "…" : "TREINAR"}
                          </Text>
                        </Pressable>
                      ) : null}

                      <Pressable
                        onPress={() => setInspectId(null)}
                        accessibilityRole="button"
                        accessibilityLabel="Fechar card"
                        accessibilityState={{}}
                        style={styles.modalCancel}
                      >
                        <Text style={styles.modalCancelText}>FECHAR</Text>
                      </Pressable>
                    </>
                  )}
                </ScrollView>
              </View>
            </View>
          );
        })()}
      </Modal>

      {/* Escolher a formação da equipe (item 5) — como na Formação Tática. */}
      <Modal
        visible={formationOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setFormationOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>ESCOLHA A FORMAÇÃO</Text>
            <Text style={styles.modalHint}>
              Os melhores jogadores de cada posição entram na escalação. Treinar
              nela sobe o entrosamento do time.
            </Text>
            <View style={styles.formationGrid}>
              {FORMATION_KEYS.map((key) => {
                const active = lineup?.formation === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => changeFormation(key)}
                    accessibilityRole="button"
                    accessibilityLabel={`Formação ${key}`}
                    accessibilityState={{ selected: active }}
                    style={[
                      styles.formationChip,
                      active && styles.formationChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.formationChipText,
                        active && styles.formationChipTextActive,
                      ]}
                    >
                      {key}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              onPress={() => setFormationOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Cancelar escolha de formação"
              accessibilityState={{}}
              style={styles.modalCancel}
            >
              <Text style={styles.modalCancelText}>CANCELAR</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Escolher os participantes do treino em grupo — só disponíveis entram. */}
      <Modal
        visible={participantsOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setParticipantsOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>QUEM TREINA EM GRUPO</Text>
            <Text style={styles.modalHint}>
              Só APTOS entram. Os indisponíveis (lesão, suspensão, já em treino)
              aparecem marcados e não podem ser escolhidos.
            </Text>
            <ScrollView style={styles.modalList}>
              {[...allPlayers]
                // Aptos primeiro; indisponíveis no fim, para a escolha ficar limpa.
                .sort(
                  (a, b) =>
                    Number(b.availability === "AVAILABLE") -
                    Number(a.availability === "AVAILABLE"),
                )
                .map((p) => {
                  const badge = availabilityBadge(p.availability);
                  const unavailable = badge !== null;
                  const isBase = youthIds.has(p.playerId);
                  const on = groupParticipants.has(p.playerId) && !unavailable;
                  return (
                    <Pressable
                      key={p.playerId}
                      disabled={unavailable}
                      onPress={() => {
                        const next = new Set(groupParticipants);
                        if (on) next.delete(p.playerId);
                        else next.add(p.playerId);
                        setGroupDraft(next);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={
                        unavailable
                          ? `${p.name} indisponível: ${badge.label}`
                          : `${on ? "Remover" : "Adicionar"} ${p.name}`
                      }
                      accessibilityState={{
                        selected: on,
                        disabled: unavailable,
                      }}
                      style={[styles.attrRow, unavailable && styles.rowDisabled]}
                    >
                      <Icon
                        name={unavailable ? "warning" : "checkmark-circle"}
                        size={18}
                        color={
                          unavailable
                            ? badge.tone === "danger"
                              ? color.danger
                              : color.warning
                            : on
                              ? color.primary
                              : color.textFaint
                        }
                      />
                      <Text
                        style={[
                          styles.attrName,
                          { flex: 1, marginLeft: space.sm },
                          unavailable && { color: color.textMuted },
                        ]}
                        numberOfLines={1}
                      >
                        {p.name}
                      </Text>
                      {isBase ? <Text style={styles.baseTag}>BASE</Text> : null}
                      {unavailable ? (
                        <Text
                          style={[
                            styles.statusTag,
                            {
                              color:
                                badge.tone === "danger"
                                  ? color.danger
                                  : color.warning,
                            },
                          ]}
                        >
                          {badge.label}
                        </Text>
                      ) : (
                        <Text style={styles.attrValue}>
                          {p.primaryPosition} · {p.overall}
                        </Text>
                      )}
                    </Pressable>
                  );
                })}
            </ScrollView>
            <Pressable
              onPress={() => setParticipantsOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Confirmar participantes"
              accessibilityState={{}}
              style={styles.modalCancel}
            >
              <Text style={styles.modalCancelText}>
                PRONTO ({groupParticipants.size})
              </Text>
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
  shirt: {
    color: color.textFaint,
    fontSize: fontSize.md,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
    width: 28,
  },
  actionBusy: { opacity: 0.5 },
  actionText: {
    color: color.background,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold as "700",
  },
  cardTitle: {
    color: color.textMuted,
    fontSize: 9,
    fontWeight: fontWeight.bold as "700",
    letterSpacing: 0.3,
    marginBottom: space.xs,
  },
  // Listagem PADRÃO — rows como no elenco.
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingVertical: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.border,
  },
  rowFirst: { borderTopWidth: 0 },
  info: { flex: 1, gap: 2 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: space.xs },
  name: {
    flexShrink: 1,
    color: color.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as "700",
  },
  meta: { color: color.textMuted, fontSize: fontSize.xs },
  metaSkill: { color: color.primary, fontWeight: fontWeight.bold as "700" },
  cdTime: {
    color: color.textMuted,
    fontSize: 10,
    fontWeight: fontWeight.bold as "700",
    marginTop: 3,
  },
  cdTimeLarge: {
    color: color.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as "700",
    marginTop: space.sm,
  },
  cdTrack: {
    height: 6,
    borderRadius: radius.pill,
    overflow: "hidden",
    marginTop: 3,
  },
  cdFill: { height: "100%" },
  cdTrackLarge: {
    height: 8,
    borderRadius: radius.pill,
    overflow: "hidden",
    marginTop: space.xs,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    marginTop: space.sm,
    marginBottom: space.xs,
  },
  sectionHeader: {
    color: color.text,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.black as "800",
    letterSpacing: 0.5,
  },
  ovr: {
    minWidth: 32,
    textAlign: "right",
    color: color.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold as "700",
  },
  rowStatusTraining: { color: color.primary, fontSize: 10 },
  rowStatusBlocked: { color: color.warning, fontSize: 10 },
  rowStatusTeam: { color: color.info, fontSize: 10 },
  cohTrack: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: color.surface,
    overflow: "hidden",
    marginTop: space.sm,
  },
  cohFill: { height: "100%", backgroundColor: color.primary },
  teamBlock: { marginTop: space.md, gap: space.xs },
  teamHeadRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  teamFormation: {
    color: color.text,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
    letterSpacing: 1,
  },
  changeFormationBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
    backgroundColor: color.surface,
  },
  changeFormationText: {
    color: color.primary,
    fontSize: 10,
    fontWeight: fontWeight.bold as "700",
  },
  participantWrap: { flexDirection: "row", flexWrap: "wrap", gap: space.xs },
  participantChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: color.background,
    borderRadius: radius.sm,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    maxWidth: "48%",
  },
  participantPos: {
    color: color.textMuted,
    fontSize: 9,
    fontWeight: fontWeight.bold as "700",
    minWidth: 22,
  },
  participantName: { color: color.text, fontSize: fontSize.xs, flexShrink: 1 },
  formationGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
    marginVertical: space.sm,
  },
  formationChip: {
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.md,
    backgroundColor: color.surface,
  },
  formationChipActive: { backgroundColor: color.primary },
  formationChipText: {
    color: color.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold as "700",
  },
  formationChipTextActive: { color: color.background },
  // Inspeção — estrutura do elenco: backdrop separado, card em View (slide roda).
  inspectRoot: { flex: 1 },
  inspectBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  inspectWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: space.lg,
  },
  inspectScroll: { width: "100%", maxWidth: 420, flexGrow: 0 },
  inspectCard: {
    gap: space.md,
    paddingVertical: space.lg,
  },
  cardAction: {
    alignItems: "center",
    paddingVertical: space.md,
    borderRadius: radius.pill,
    backgroundColor: color.primary,
  },
  cardActionCollect: { backgroundColor: color.success },
  cardActionText: {
    color: color.background,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as "700",
  },
  projectionBox: {
    backgroundColor: color.background,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.xs,
  },
  projectionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  projCurrent: {
    color: color.textMuted,
    fontSize: 28,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
  },
  projTarget: {
    color: color.success,
    fontSize: 28,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
  },
  projDelta: {
    color: color.success,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as "700",
  },
  cohesionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.lg,
    marginTop: space.sm,
  },
  cohesionValue: {
    color: color.primary,
    fontSize: 40,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
  },
  cohesionInfo: { flex: 1, gap: 2 },
  cohesionLabel: {
    color: color.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as "700",
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
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  rowDisabled: { opacity: 0.6 },
  attrName: { color: color.text, fontSize: fontSize.sm },
  attrValue: {
    color: color.textMuted,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as "700",
  },
  statusTag: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.black as "800",
    letterSpacing: 0.3,
  },
  baseTag: {
    fontSize: 9,
    fontWeight: fontWeight.black as "800",
    letterSpacing: 0.5,
    color: color.primary,
    borderWidth: 1,
    borderColor: color.primary,
    borderRadius: radius.sm,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  modalCancel: { alignItems: "center", paddingVertical: space.md },
  modalCancelText: {
    color: color.textMuted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold as "700",
  },
});
