import { FORMATIONS, type FormationKey } from "./formations";

/**
 * A escalação OFICIAL do clube (query `lineup`, command `tactics:set-lineup`) —
 * a ponte entre o campo desenhado na tela e o que a partida realmente usa.
 *
 * Por que existe: o elenco (`club:command` / memberships S01..S23) guarda QUEM é
 * titular, e nada mais. A FORMAÇÃO não cabe ali. Sem `tactics:set-lineup`, a
 * formação vivia só no rascunho local (AsyncStorage) e o motor de partida caía
 * na média do elenco inteiro — trocar de esquema não mudava nada em campo
 * (`prisma-match-play-repository.ts:561`, onde a força sai de `ClubLineup`
 * quando ela existe, e do elenco quando não).
 */
export interface ServerLineupStarter {
  readonly playerId: string;
  readonly slotIndex: number;
}

export interface ServerLineup {
  readonly formation: string;
  readonly version: number;
  readonly starters: readonly ServerLineupStarter[];
  readonly bench: readonly string[];
}

/** O que a tela mostra: esquema + os 11 em ordem de slot + o banco. */
export interface LineupSelection {
  readonly formation: FormationKey;
  readonly onPitchIds: readonly string[];
  readonly benchIds: readonly string[];
}

export interface SetLineupPayload {
  readonly clubId: string;
  readonly formation: string;
  readonly starters: readonly string[];
  readonly bench: readonly string[];
  readonly expectedVersion: number | null;
}

const STARTERS = 11;

function isDrawableFormation(name: string): name is FormationKey {
  return name in FORMATIONS;
}

/**
 * Converte a escalação oficial no estado da tela, ou `null` se ela não servir
 * para este elenco (titular vendido, formação que o campo não desenha, 11
 * incompletos). `null` significa "monte do zero" — nunca um campo com buraco.
 *
 * O banco é reconciliado: mantém a ordem gravada e acrescenta ao fim quem está
 * no elenco e não foi citado (um reforço comprado depois da última escalação).
 */
export function hydrateFromServerLineup(
  lineup: ServerLineup | null,
  squadIds: ReadonlySet<string>,
): LineupSelection | null {
  if (lineup === null) return null;
  if (!isDrawableFormation(lineup.formation)) return null;
  if (lineup.starters.length !== STARTERS) return null;

  const onPitchIds = [...lineup.starters]
    .sort((a, b) => a.slotIndex - b.slotIndex)
    .map((starter) => starter.playerId);
  // Um titular fora do elenco deixaria o campo incompleto — remonta do zero.
  if (onPitchIds.some((id) => !squadIds.has(id))) return null;

  const onPitch = new Set(onPitchIds);
  const benchIds = lineup.bench.filter(
    (id) => squadIds.has(id) && !onPitch.has(id),
  );
  const shown = new Set([...onPitchIds, ...benchIds]);
  const missing = [...squadIds].filter((id) => !shown.has(id));

  return { formation: lineup.formation, onPitchIds, benchIds: [...benchIds, ...missing] };
}

/** True quando a seleção da tela não é a que está gravada — há o que salvar. */
export function serverLineupDiffers(
  lineup: ServerLineup | null,
  selection: LineupSelection,
): boolean {
  if (lineup === null) return true;
  const gravada: LineupSelection = {
    // A formação gravada pode não ser desenhável aqui; para efeito de comparação
    // basta o texto — se diferir, há o que salvar de qualquer jeito.
    formation: lineup.formation as FormationKey,
    onPitchIds: [...lineup.starters]
      .sort((a, b) => a.slotIndex - b.slotIndex)
      .map((starter) => starter.playerId),
    benchIds: lineup.bench,
  };
  return selectionDiffers(gravada, selection);
}

/**
 * True quando duas seleções não são a mesma escalação. É o gatilho do autosave:
 * a ORDEM conta nos titulares (é quem ocupa cada slot) e no banco.
 */
export function selectionDiffers(
  a: LineupSelection | null,
  b: LineupSelection,
): boolean {
  if (a === null) return true;
  return (
    a.formation !== b.formation ||
    !sameOrder(a.onPitchIds, b.onPitchIds) ||
    !sameOrder(a.benchIds, b.benchIds)
  );
}

function sameOrder(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

/**
 * A versão que a escalação passa a ter depois de um save aceito.
 *
 * `SetClubLineup` grava `version = (atual ?? 0) + 1`. O autosave precisa saber
 * disso SEM esperar o refetch: duas edições seguidas reenviariam a mesma
 * `expectedVersion` e a segunda morreria em `AGGREGATE_VERSION_CONFLICT`.
 */
export function nextLineupVersion(current: number | null): number {
  return (current ?? 0) + 1;
}

/**
 * Concilia a versão que temos em mãos com a que a query trouxe.
 *
 * Só anda para FRENTE. A query é assíncrona e pode chegar atrasada: logo depois
 * de um save aceito (v2 local) uma resposta antiga ainda diz v1, e adotá-la
 * jogaria o cliente de volta ao conflito que ele acabou de evitar. Já uma
 * versão MAIOR que a nossa é fato novo — outro aparelho, ou a tela de treino
 * trocando o esquema — e essa manda.
 */
export function reconcileLineupVersion(
  local: number | null,
  fromServer: number | null,
): number | null {
  if (fromServer === null) return local;
  if (local === null) return fromServer;
  return Math.max(local, fromServer);
}

/** O errorCode que diz "sua versão está velha" — o único que vale reenviar. */
export const VERSION_CONFLICT = "AGGREGATE_VERSION_CONFLICT";

/**
 * Vale reenviar este save depois de reler a versão? Só no conflito de versão, e
 * só na primeira tentativa.
 *
 * Reenviar é honesto aqui porque a intenção do usuário não é ambígua: ele
 * mexeu no campo, e a escalação que ele vê é a que deve valer. O que estava
 * velho era o número da versão, não o desejo. Qualquer outro erro (jogador fora
 * do elenco, formação desconhecida) é problema de CONTEÚDO — reenviar só
 * repetiria a recusa, então ele sobe para o usuário.
 */
export function shouldRetryAfterConflict(
  errorCode: string | null,
  attempt: number,
): boolean {
  return errorCode === VERSION_CONFLICT && attempt === 0;
}

/**
 * O payload de `tactics:set-lineup`. `expectedVersion` é a versão que o cliente
 * ACREDITA ser a corrente — vinda da query na primeira gravação e de
 * `nextLineupVersion` nas seguintes, porque o autosave não espera o refetch.
 */
export function setLineupPayload(
  clubId: string,
  expectedVersion: number | null,
  selection: LineupSelection,
): SetLineupPayload {
  return {
    clubId,
    formation: selection.formation,
    starters: [...selection.onPitchIds],
    bench: [...selection.benchIds],
    expectedVersion,
  };
}
