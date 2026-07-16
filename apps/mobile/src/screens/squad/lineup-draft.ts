import AsyncStorage from "@react-native-async-storage/async-storage";

import type { FormationKey } from "./formations";

/**
 * Rascunho local da escalação (semântica `SET_LINEUP_DRAFT` da whitelist
 * offline do kernel de cliente): pode ser editado offline e sobrevive a
 * refetch/restart; a escalação FINAL só é persistida online via club:command.
 */
export interface LineupDraft {
  readonly formation: FormationKey;
  readonly onPitchIds: readonly string[];
  readonly benchIds: readonly string[];
}

function draftKey(worldId: string, clubId: string): string {
  return `grinta:lineup-draft:${worldId}:${clubId}`;
}

export async function readLineupDraft(
  worldId: string,
  clubId: string,
): Promise<LineupDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(draftKey(worldId, clubId));
    if (raw === null) return null;
    const parsed = JSON.parse(raw) as LineupDraft;
    if (
      !Array.isArray(parsed.onPitchIds) ||
      !Array.isArray(parsed.benchIds) ||
      typeof parsed.formation !== "string"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function writeLineupDraft(
  worldId: string,
  clubId: string,
  draft: LineupDraft,
): Promise<void> {
  try {
    await AsyncStorage.setItem(draftKey(worldId, clubId), JSON.stringify(draft));
  } catch {
    // cache local é best-effort
  }
}

export async function clearLineupDraft(
  worldId: string,
  clubId: string,
): Promise<void> {
  try {
    await AsyncStorage.removeItem(draftKey(worldId, clubId));
  } catch {
    // cache local é best-effort
  }
}
