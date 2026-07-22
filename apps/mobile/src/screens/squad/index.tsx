import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  findNodeHandle,
  ScrollView,
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
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
import { submitTrackedCommand } from "@/lib/command-orchestrator";
import { deriveScreenState } from "@/lib/screen-state";
import { useSession } from "@/lib/session";
import { commandIdempotencyKey, onDay, onRevision } from "@/lib/idempotency";
import { useRequiredWorldId, useWorldQuery } from "@/lib/world";
import {
  clearLineupDraft,
  readLineupDraft,
  writeLineupDraft,
} from "./lineup-draft";
import {
  hydrateFromServerLineup,
  nextLineupVersion,
  reconcileLineupVersion,
  selectionDiffers,
  setLineupPayload,
  shouldRetryAfterConflict,
  type LineupSelection,
  type ServerLineup,
} from "./lineup-server";
import { useToast } from "@/components/toast";
import { commandFeedback } from "@/lib/command-feedback";
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
import { ReserveCard } from "./reserve-card";
import {
  canSubstituteIntoSlot,
  fitRank,
  positionFit,
  type PositionFit,
} from "./substitution-model";
import {
  PlayerSkillCard,
  type PlayerCardCrest,
  type PlayerSkillCardData,
} from "@/components/player-skill-card";
import { positionGroupTint } from "@/components/position-badge";
import { clubCrestData } from "@/screens/club/customization/visual-identity";

/**
 * Quanto o autosave espera a mão parar antes de gravar. Substituir três
 * jogadores em sequência é UMA escalação, não três commands.
 */
const AUTOSAVE_DELAY_MS = 800;

/** Tela de Elenco: campo tático (formação editável) + modal de substituição. */
export function Squad() {
  const reducedMotion = useReducedMotion();
  const sheetRef = useRef<View>(null);
  const worldId = useRequiredWorldId();
  const toast = useToast();
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
  // Escudo do clube gerido, pro card do jogador. Usa a identidade real quando
  // personalizada; senão a default determinística pelo nome (mesma do admin).
  const clubCrest = useMemo<PlayerCardCrest | null>(
    () =>
      managedClub === null
        ? null
        : clubCrestData(
            managedClub.name,
            managedClub.primaryColor,
            managedClub.secondaryColor,
            managedClub.crestTemplateId,
          ),
    [managedClub],
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
  // A escalação OFICIAL (query `lineup`, R-220 Fase 1) — é ela, e não as
  // memberships, que a partida lê para montar a força do time
  // (`prisma-match-play-repository.ts:561`). Sem esta leitura, a tela não tinha
  // como saber a formação gravada nem a versão para o `expectedVersion`.
  const lineupQuery = useWorldQuery<{ lineup: ServerLineup | null }>(
    managedClub === null ? null : "lineup",
    managedClub === null ? undefined : { clubId: managedClub.id },
  );
  // "Não há escalação" e "não consegui ler" são coisas diferentes: só a leitura
  // CONCLUÍDA autoriza tratar `null` como ausência.
  const lineupReadable =
    lineupQuery.state === "ready" || lineupQuery.state === "empty";
  const serverLineup = lineupQuery.data?.lineup ?? null;
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
  // Reserva aberto no card FC (detalhe). `null` = só a lista.
  const [detailId, setDetailId] = useState<string | null>(null);

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

  const closeSheet = useCallback(() => {
    setActiveSlot(null);
    setDetailId(null);
  }, []);
  const focusSheet = useCallback(() => {
    const node = findNodeHandle(sheetRef.current);
    if (node !== null) AccessibilityInfo.setAccessibilityFocus(node);
  }, []);

  // Monta a escalação quando o elenco chega — de forma ROBUSTA.
  //
  // O bug anterior: `onPitchIds` inicializava vazio (o elenco ainda não tinha
  // carregado) e a hidratação rodava UMA vez por clube, numa corrida com o
  // carregamento assíncrono. Se ela perdia a corrida, o campo e o banco ficavam
  // vazios — jogadores reais no elenco, "—" em todo slot.
  //
  // Agora é auto-curativo: sempre que a escalação atual for inválida (não tem 11
  // no campo, ou tem um id que não é jogador do elenco), remonta na hora dos
  // jogadores reais. Isso NÃO apaga edição válida — se os 11 já batem, sai cedo.
  const hydratedClubRef = useRef<string | null>(null);
  // Estado do autosave (ver `persistLineup` abaixo): a versão que acreditamos
  // ser a corrente e a última escalação que o servidor confirmou.
  const versionRef = useRef<number | null>(null);
  const persistedRef = useRef<LineupSelection | null>(null);
  const savingRef = useRef(false);
  const pendingRef = useRef<LineupSelection | null>(null);
  /** A escalação que o servidor recusou — não se reenvia igual, só editada. */
  const falhouRef = useRef<LineupSelection | null>(null);
  useEffect(() => {
    const clubId = managedClub?.id ?? null;
    if (clubId === null || players.length < 11) return;
    const ids = new Set(players.map((p) => p.id));
    const onPitchValid =
      onPitchIds.length === 11 && onPitchIds.every((id) => ids.has(id));

    if (!onPitchValid) {
      // Escalação inválida (campo vazio no load, ou id que não é mais do elenco):
      // remonta tudo IMEDIATAMENTE (síncrono) do elenco real.
      setFormation("4-2-1-3");
      const starters = assignToFormation(
        players.filter((p) => p.starter),
        "4-2-1-3",
      );
      const startSet = new Set(starters);
      setOnPitchIds(starters);
      setBenchIds(players.filter((p) => !startSet.has(p.id)).map((p) => p.id));
      setActiveSlot(null);
    } else {
      // Os 11 batem — não desfaz a tática. Só reconcilia a RESERVA: um reforço
      // recém-comprado (que não estava na lista) entra; um vendido sai. Era o
      // bug: sem isto, contratar não aparecia no elenco até trocar de clube.
      const onPitch = new Set(onPitchIds);
      const validBench = benchIds.filter(
        (id) => ids.has(id) && !onPitch.has(id),
      );
      const shown = new Set([...onPitchIds, ...validBench]);
      const missing = players
        .filter((p) => !shown.has(p.id))
        .map((p) => p.id);
      if (missing.length > 0 || validBench.length !== benchIds.length) {
        setBenchIds([...validBench, ...missing]);
      }
    }

    // Depois, a escalação de verdade. A ordem de preferência é dura:
    //   1. a ESCALAÇÃO OFICIAL do servidor — é ela que joga a partida;
    //   2. o rascunho local, só se não houver escalação gravada;
    //   3. o remonte padrão acima.
    // Antes só existia o passo 2, e o rascunho é local: o time que o jogador
    // via na tela não era o time que entrava em campo.
    if (!lineupReadable) return; // ainda não sei o que está gravado — não chuto
    if (hydratedClubRef.current === clubId) return;
    hydratedClubRef.current = clubId;
    // A versão de partida do autosave sai da LEITURA; daqui em diante ela é
    // contada localmente a cada save aceito.
    versionRef.current = serverLineup?.version ?? null;

    const fromServer = hydrateFromServerLineup(serverLineup, ids);
    if (fromServer !== null) {
      setFormation(fromServer.formation);
      setOnPitchIds([...fromServer.onPitchIds]);
      setBenchIds([...fromServer.benchIds]);
      // Isto JÁ está gravado — marcar como persistido é o que impede o autosave
      // de devolver ao servidor exatamente o que acabou de ler.
      persistedRef.current = fromServer;
      return;
    }

    // Sem escalação gravada (ou inservível para este elenco): tenta o rascunho
    // salvo e sobrepõe SE ainda for válido. `players.every(...)` garante que um
    // rascunho ANTERIOR à compra (sem o reforço) seja rejeitado — senão ele
    // reesconderia o jogador recém-contratado.
    void readLineupDraft(worldId, clubId).then((draft) => {
      if (draft === null) return;
      const draftIds = new Set([...draft.onPitchIds, ...draft.benchIds]);
      const draftValid =
        draft.onPitchIds.length === 11 &&
        [...draftIds].every((id) => ids.has(id)) &&
        players.every((p) => draftIds.has(p.id));
      if (draftValid) {
        setFormation(draft.formation);
        setOnPitchIds([...draft.onPitchIds]);
        setBenchIds([...draft.benchIds]);
      }
    });
  }, [
    managedClub?.id,
    players,
    worldId,
    onPitchIds,
    benchIds,
    lineupReadable,
    serverLineup,
  ]);

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

  const selection = useMemo<LineupSelection>(
    () => ({ formation, onPitchIds, benchIds }),
    [formation, onPitchIds, benchIds],
  );
  const [saving, setSaving] = useState(false);
  const [demotingId, setDemotingId] = useState<string | null>(null);

  /**
   * Desce um jovem profissional (≤ 21) de volta à base (C8). O servidor valida a
   * idade e move a membership; ao aplicar, recarrega o elenco e fecha o detalhe.
   */
  const demoteToYouth = useCallback(
    (playerId: string) => {
      if (managedClub === null || client === null || contractVersion === null) {
        return;
      }
      // Chave por DIA lógico, não eterna: rebaixar→promover→rebaixar é ciclo
      // legítimo, e `demote:${club}:${player}` fazia a 2ª descida sumir.
      const worldDate = clubQuery.asOf ?? "";
      if (worldDate === "") return;
      const idempotencyKey = commandIdempotencyKey({
        commandType: "youth:demote-player",
        target: playerId,
        occasion: onDay(worldDate),
      });
      setDemotingId(playerId);
      void submitTrackedCommand(client, {
        clientContractVersion: "v1",
        serverContractVersion: contractVersion,
        commandType: "youth:demote-player",
        worldId,
        payload: { clubId: managedClub.id, playerId },
        idempotencyKey,
        correlationId: `mobile:${idempotencyKey}`,
      }).then((result) => {
        setDemotingId(null);
        if (
          result.status === CommandTrackingStatus.ACCEPTED ||
          result.status === CommandTrackingStatus.APPLIED
        ) {
          setDetailId(null);
          rosterQuery.refetch();
        }
      });
    },
    [client, contractVersion, managedClub, worldId, clubQuery.asOf, rosterQuery],
  );

  /**
   * AUTOSAVE da escalação.
   *
   * Não há mais botão "Salvar": mexeu no campo, grava. A confirmação é o toast
   * — e ele só aparece quando o servidor ACEITOU, nunca por otimismo.
   *
   * O que sumiu daqui, e por quê: a sincronia das memberships do elenco
   * (`club:command` com `squadId`/`expectedVersion`). Ela dependia de
   * `clubQuery.data.squads`, campo que a query `club-detail` NÃO devolve — era
   * código morto que, de quebra, era a guarda que impedia a escalação de ser
   * salva. A escalação oficial (`ClubLineup`) é o que a partida lê para montar
   * a força do time, e ela não precisa do agregado de elenco.
   *
   * `versionRef` guarda a versão que acreditamos ser a corrente. Ela avança
   * SOZINHA a cada save aceito (`nextLineupVersion`) porque o autosave não pode
   * esperar o refetch: duas edições seguidas reenviariam a mesma
   * `expectedVersion` e a segunda morreria em AGGREGATE_VERSION_CONFLICT.
   */
  const persistLineup = useCallback(
    async (sel: LineupSelection, attempt = 0): Promise<void> => {
      if (managedClub === null || client === null || contractVersion === null) {
        return;
      }
      // Um save por vez. O mais recente espera a vez em `pendingRef` — sem isso,
      // arrastar três jogadores em sequência mandaria três commands com a mesma
      // versão e dois voltariam em conflito.
      if (savingRef.current) {
        pendingRef.current = sel;
        return;
      }
      savingRef.current = true;
      setSaving(true);

      const payload = setLineupPayload(managedClub.id, versionRef.current, sel);
      const idempotencyKey = commandIdempotencyKey({
        commandType: "tactics:set-lineup",
        target: managedClub.id,
        // A chave carrega o CONTEÚDO, não só a versão: voltar atrás para uma
        // escalação já enviada é edição legítima e não pode virar no-op.
        occasion: onRevision(
          versionRef.current ?? 0,
          payload.formation,
          payload.starters.join(","),
          payload.bench.join(","),
        ),
      });
      const result = await submitTrackedCommand(client, {
        clientContractVersion: "v1",
        serverContractVersion: contractVersion,
        commandType: "tactics:set-lineup",
        worldId,
        payload: { ...payload },
        idempotencyKey,
        correlationId: `mobile:${idempotencyKey}`,
      });

      const aceito =
        result.status === CommandTrackingStatus.ACCEPTED ||
        result.status === CommandTrackingStatus.APPLIED;

      if (aceito) {
        versionRef.current = nextLineupVersion(versionRef.current);
        persistedRef.current = sel;
        falhouRef.current = null;
        await clearLineupDraft(worldId, managedClub.id);
      } else if (shouldRetryAfterConflict(result.errorCode, attempt)) {
        // Conflito de versão: o número que tínhamos envelheceu, a escalação na
        // tela continua sendo a que o usuário quer. Relê a versão REAL e
        // reenvia UMA vez, calado — `refetch()` não servia aqui porque ele só
        // mexe no estado do React, e a versão do autosave vive num ref: o
        // reenvio seguinte saía com o mesmo número velho e conflitava de novo,
        // em laço, um toast de erro por edição.
        try {
          const fresh = await client.query<{ lineup: ServerLineup | null }>(
            worldId,
            "lineup",
            { params: { clubId: managedClub.id } },
          );
          versionRef.current = fresh.data.lineup?.version ?? null;
        } catch {
          // Não deu para reler: cai no relato de erro abaixo, sem reenviar.
          versionRef.current = null;
        }
        savingRef.current = false;
        setSaving(false);
        await persistLineup(sel, attempt + 1);
        return;
      } else {
        // Erro de conteúdo (ou conflito que persistiu): não insiste na MESMA
        // escalação — senão o autosave a reenviaria a cada 800 ms para sempre.
        // Qualquer edição nova limpa esta trava e volta a tentar.
        falhouRef.current = sel;
        lineupQuery.refetch();
      }

      const fb = commandFeedback(result, "Escalação salva.");
      if (fb !== null) toast.show(fb);

      savingRef.current = false;
      setSaving(false);

      const proxima = pendingRef.current;
      pendingRef.current = null;
      if (
        aceito &&
        proxima !== null &&
        selectionDiffers(persistedRef.current, proxima)
      ) {
        await persistLineup(proxima);
      }
    },
    [client, contractVersion, managedClub, worldId, toast, lineupQuery],
  );

  // Toda releitura da escalação reconcilia a versão do autosave. Sem isto, uma
  // mudança vinda de fora (a tela de treino troca o esquema, outro aparelho)
  // deixava o ref velho para sempre — hidratação roda uma vez só por clube.
  useEffect(() => {
    if (savingRef.current) return; // save em voo manda; resposta atrasada não
    versionRef.current = reconcileLineupVersion(
      versionRef.current,
      serverLineup?.version ?? null,
    );
  }, [serverLineup]);

  // O gatilho: qualquer edição válida do campo. `hydratedClubRef` garante que a
  // montagem inicial (que vem do próprio servidor) não se salve de volta.
  useEffect(() => {
    const clubId = managedClub?.id ?? null;
    if (clubId === null || hydratedClubRef.current !== clubId) return;
    if (!lineupReadable || onPitchIds.length !== 11) return;
    if (!selectionDiffers(persistedRef.current, selection)) return;
    // Já recusada exatamente assim: reenviar repetiria a recusa em laço.
    if (!selectionDiffers(falhouRef.current, selection)) return;

    // Espera a mão parar: substituir três jogadores é UMA escalação, não três.
    const timer = setTimeout(() => {
      void persistLineup(selection);
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [selection, managedClub?.id, lineupReadable, onPitchIds.length, persistLineup]);

  const refresh = useCallback(() => {
    clubQuery.refetch();
    identityQuery.refetch();
    rosterQuery.refetch();
    lineupQuery.refetch();
  }, [
    clubQuery.refetch,
    identityQuery.refetch,
    rosterQuery.refetch,
    lineupQuery.refetch,
  ]);

  const substitute = useCallback(
    (benchPlayerId: string) => {
      if (activeSlot === null) return;
      // Quem decide é o SLOT do campo, não a posição de quem está nele: com um
      // zagueiro escalado na lateral, o campo mostrava "LE" e o modal oferecia
      // o leque do ZAG — outra formação na hora de trocar.
      if (!canSubstituteIntoSlot(slots[activeSlot]?.role, byId.get(benchPlayerId))) {
        return;
      }
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
    [activeSlot, onPitchIds, byId, slots],
  );

  const outgoing =
    activeSlot !== null ? byId.get(onPitchIds[activeSlot] ?? "") : undefined;
  const outgoingRole =
    activeSlot !== null ? slots[activeSlot]?.role : undefined;
  // Todas as reservas, com o encaixe no SLOT (natural/adaptável/bloqueado) —
  // ordenadas para os ELEGÍVEIS aparecerem primeiro (natural antes de
  // adaptável, bloqueado por último). Ordem estável dentro de cada faixa.
  const benchOptions = useMemo(() => {
    const opts = benchIds
      .map((id) => byId.get(id))
      .filter((p): p is SquadPlayer => Boolean(p))
      .map((p, index) => {
        const fit: PositionFit =
          outgoingRole === undefined
            ? "none"
            : positionFit(outgoingRole, p.position);
        return { player: p, fit, eligible: fit !== "none", index };
      });
    return opts
      .sort((a, b) => fitRank(a.fit) - fitRank(b.fit) || a.index - b.index)
      .map(({ player, fit, eligible }) => ({ player, fit, eligible }));
  }, [outgoingRole, benchIds, byId]);
  const eligibleCount = benchOptions.filter((o) => o.eligible).length;

  const detail = detailId === null ? undefined : byId.get(detailId);
  const detailFit: PositionFit =
    detail && outgoingRole !== undefined
      ? positionFit(outgoingRole, detail.position)
      : "none";

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
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Voltar ao elenco"
            style={styles.backRow}
          >
            <Icon name="arrow-back" size={22} color={color.text} />
            <Text style={styles.backText}>ELENCO</Text>
          </Pressable>
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
          <View style={styles.headerLeft}>
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Voltar ao elenco"
              hitSlop={8}
              style={styles.back}
            >
              <Icon name="arrow-back" size={22} color={color.text} />
            </Pressable>
            <View style={{ flexShrink: 1 }}>
              <Text style={styles.title}>ELENCO</Text>
              <Text style={styles.subtitle}>
                {managedClub.name.toUpperCase()} · ELENCO OFICIAL
              </Text>
            </View>
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

        {/* Sem botão: a escalação grava sozinha. Este bloco só existe enquanto
            o command está em voo — o veredito vem no toast, do servidor. */}
        {saving ? (
          <View style={styles.saveBar} accessibilityLiveRegion="polite">
            <ActivityIndicator color={color.primary} />
            <Text style={styles.saveNote}>Salvando escalação…</Text>
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
                  {outgoingRole !== undefined && outgoing.position !== outgoingRole
                    ? ` · natural ${outgoing.position}`
                    : ""}
                </Text>
              ) : null}
              {outgoingRole !== undefined ? (
                <Text style={styles.sheetRule}>
                  {outgoingRole} e posições que se adaptam · toque para ver o card
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
            ENTRA — RESERVAS ({eligibleCount} de {benchOptions.length})
          </Text>
          <ScrollView
            contentContainerStyle={styles.sheetList}
            showsVerticalScrollIndicator={false}
          >
            {benchOptions.length === 0 ? (
              <Text style={styles.empty}>Sem reservas disponíveis.</Text>
            ) : (
              benchOptions.map(({ player: p, fit, eligible }) => (
                <Pressable
                  key={p.id}
                  onPress={() => setDetailId(p.id)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    eligible
                      ? `Ver card de ${p.name}${fit === "adaptable" ? " (adapta)" : ""}`
                      : `Ver card de ${p.name} — ${p.position} não cobre ${outgoingRole ?? ""}`
                  }
                  style={[styles.benchRow, eligible ? null : styles.benchBlocked]}
                >
                  <ReserveCard
                    p={p}
                    outgoing={outgoing}
                    fit={fit}
                    crest={clubCrest}
                  />
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>

        {detail ? (
          <View style={styles.detailOverlay}>
            <Pressable
              style={styles.detailBackdrop}
              onPress={() => setDetailId(null)}
            />
            <View style={styles.detailWrap} pointerEvents="box-none">
              <View style={styles.detailCard}>
              <PlayerSkillCard
                data={
                  {
                    name: detail.name,
                    number: detail.number,
                    position: detail.position,
                    positionTint: positionGroupTint(detail.group),
                    age: detail.age,
                    ovr: detail.ovr,
                    pot: detail.pot,
                    fitness: detail.fitness,
                    morale: detail.morale,
                    groups: detail.groups,
                    attributes: detail.attributes,
                    crest: clubCrest,
                  } satisfies PlayerSkillCardData
                }
              />

              {outgoing ? (
                <View
                  style={[
                    styles.detailFitNote,
                    detailFit === "adaptable"
                      ? styles.detailFitAdapt
                      : detailFit === "none"
                        ? styles.detailFitBlocked
                        : styles.detailFitNatural,
                  ]}
                >
                  <Icon
                    name={
                      detailFit === "none" ? "warning" : "swap-horizontal"
                    }
                    size={13}
                    color={
                      detailFit === "adaptable"
                        ? color.warning
                        : detailFit === "none"
                          ? color.textMuted
                          : color.primary
                    }
                  />
                  <Text style={styles.detailFitText}>
                    {detailFit === "natural"
                      ? `Posição natural de ${outgoingRole ?? ""}.`
                      : detailFit === "adaptable"
                        ? `Adapta de ${detail.position} para ${outgoingRole ?? ""}.`
                        : `${detail.position} não cobre ${outgoingRole ?? ""}.`}
                  </Text>
                </View>
              ) : null}

              <View style={styles.detailActions}>
                <Pressable
                  onPress={() => setDetailId(null)}
                  accessibilityRole="button"
                  accessibilityLabel="Fechar card"
                  style={styles.detailClose}
                >
                  <Text style={styles.detailCloseText}>FECHAR</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    if (detailFit === "none") return;
                    substitute(detail.id);
                    setDetailId(null);
                  }}
                  disabled={detailFit === "none"}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: detailFit === "none" }}
                  accessibilityLabel={`Escalar ${detail.name}`}
                  style={[
                    styles.detailEscalar,
                    detailFit === "none" ? styles.detailEscalarOff : null,
                  ]}
                >
                  <Icon
                    name="arrow-up"
                    size={14}
                    color={color.primaryContrast}
                  />
                  <Text style={styles.detailEscalarText}>ESCALAR</Text>
                </Pressable>
              </View>
              {detail.age <= 21 ? (
                <Pressable
                  onPress={() => demoteToYouth(detail.id)}
                  disabled={demotingId !== null}
                  accessibilityRole="button"
                  accessibilityLabel={`Descer ${detail.name} à base`}
                  accessibilityState={{ disabled: demotingId !== null }}
                  style={styles.detailDemote}
                >
                  <Icon name="arrow-down" size={14} color={color.textMuted} />
                  <Text style={styles.detailDemoteText}>
                    {demotingId !== null ? "..." : "DESCER À BASE"}
                  </Text>
                </Pressable>
              ) : null}
              </View>
            </View>
          </View>
        ) : null}
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
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    flexShrink: 1,
  },
  back: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    marginBottom: space.md,
  },
  backText: {
    color: color.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
    letterSpacing: 0.5,
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
    ...StyleSheet.absoluteFill,
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
  sheetRule: { color: color.primary, fontSize: 10, marginTop: 2, letterSpacing: 0.3 },
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
  benchBlocked: { opacity: 0.42 },
  detailOverlay: { ...StyleSheet.absoluteFill },
  detailBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.72)",
  },
  detailWrap: {
    flex: 1,
    justifyContent: "center",
    padding: space.lg,
  },
  detailCard: {
    gap: space.md,
    backgroundColor: color.backgroundElevated,
    borderColor: color.borderStrong,
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: space.md,
  },
  detailFitNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  detailFitNatural: { borderColor: color.primaryDim, backgroundColor: "#151c0e" },
  detailFitAdapt: { borderColor: color.warning, backgroundColor: "#2a2109" },
  detailFitBlocked: { borderColor: color.border, backgroundColor: color.surface },
  detailFitText: { flex: 1, color: color.text, fontSize: fontSize.xs },
  detailActions: { flexDirection: "row", gap: space.sm },
  detailClose: {
    flex: 1,
    minHeight: MINIMUM_TOUCH_TARGET,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  detailCloseText: {
    color: color.textMuted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.black as "800",
    letterSpacing: 0.5,
  },
  detailDemote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs,
    minHeight: MINIMUM_TOUCH_TARGET,
    marginTop: space.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: color.border,
  },
  detailDemoteText: {
    color: color.textMuted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.black as "800",
    letterSpacing: 0.5,
  },
  detailEscalar: {
    flex: 2,
    minHeight: MINIMUM_TOUCH_TARGET,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
    borderRadius: radius.sm,
    backgroundColor: color.primary,
  },
  detailEscalarOff: { opacity: 0.4 },
  detailEscalarText: {
    color: color.primaryContrast,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.black as "800",
    letterSpacing: 0.5,
  },
});
