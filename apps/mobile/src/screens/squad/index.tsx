import { useMemo, useState, useCallback } from "react";
import { ScrollView, View, Text, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@/components/icon";
import { color, space, radius, fontSize, fontWeight } from "@/theme";
import { SQUAD_SEED, type SquadPlayer } from "./squad-data";
import { FORMATIONS, FORMATION_KEYS, assignToFormation, type FormationKey } from "./formations";
import { Pitch } from "./pitch";
import { PlayerCard } from "./player-card";

/** Tela de Elenco: campo tático (formação editável, substituições) + reservas. */
export function Squad() {
  const players = SQUAD_SEED.players;
  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const playerById = useCallback((id: string) => byId.get(id), [byId]);

  const [formation, setFormation] = useState<FormationKey>("4-2-1-3");
  const [onPitchIds, setOnPitchIds] = useState<string[]>(() =>
    assignToFormation(players.filter((p) => p.starter), "4-2-1-3"),
  );
  const [benchIds, setBenchIds] = useState<string[]>(() =>
    players.filter((p) => !p.starter).map((p) => p.id),
  );
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  const slots = FORMATIONS[formation];
  const avgOvr = useMemo(() => {
    const ovrs = onPitchIds.map((id) => byId.get(id)?.ovr ?? 0);
    return Math.round(ovrs.reduce((a, b) => a + b, 0) / (ovrs.length || 1));
  }, [onPitchIds, byId]);

  const changeFormation = useCallback(
    (key: FormationKey) => {
      setOnPitchIds((prev) => {
        const current = prev.map((id) => byId.get(id)).filter((p): p is SquadPlayer => Boolean(p));
        return assignToFormation(current, key);
      });
      setFormation(key);
      setSelectedSlot(null);
    },
    [byId],
  );

  const selectSlot = useCallback(
    (i: number) => {
      if (selectedSlot === null) {
        setSelectedSlot(i);
        return;
      }
      if (selectedSlot === i) {
        setSelectedSlot(null);
        return;
      }
      setOnPitchIds((prev) => {
        const next = [...prev];
        const a = next[selectedSlot];
        const b = next[i];
        if (a !== undefined && b !== undefined) {
          next[selectedSlot] = b;
          next[i] = a;
        }
        return next;
      });
      setSelectedSlot(null);
    },
    [selectedSlot],
  );

  const subInFromBench = useCallback(
    (benchPlayerId: string) => {
      if (selectedSlot === null) return;
      const outgoing = onPitchIds[selectedSlot];
      setOnPitchIds((prev) => {
        const next = [...prev];
        next[selectedSlot] = benchPlayerId;
        return next;
      });
      setBenchIds((b) => b.map((id) => (id === benchPlayerId ? (outgoing ?? id) : id)));
      setSelectedSlot(null);
    },
    [selectedSlot, onPitchIds],
  );

  const selectedPlayer = selectedSlot !== null ? byId.get(onPitchIds[selectedSlot] ?? "") : undefined;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>ELENCO</Text>
            <Text style={styles.subtitle}>{SQUAD_SEED.club} · titulares</Text>
          </View>
          <View style={styles.ovrPill}>
            <Text style={styles.ovrLabel}>MÉDIA XI</Text>
            <Text style={styles.ovrValue}>{avgOvr}</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.formations}>
          {FORMATION_KEYS.map((key) => {
            const active = key === formation;
            return (
              <Pressable
                key={key}
                style={[styles.formationChip, active ? styles.formationActive : null]}
                onPress={() => changeFormation(key)}
                accessibilityRole="button"
              >
                <Icon name="grid" size={13} color={active ? color.primary : color.textMuted} />
                <Text style={[styles.formationText, active ? styles.formationTextActive : null]}>{key}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Pitch
          slots={slots}
          playerIds={onPitchIds}
          playerById={playerById}
          selectedSlot={selectedSlot}
          onSelectSlot={selectSlot}
        />

        <View style={[styles.hint, selectedPlayer ? styles.hintActive : null]}>
          <Icon name={selectedPlayer ? "swap-horizontal" : "grid"} size={14} color={selectedPlayer ? color.primary : color.textMuted} />
          <Text style={[styles.hintText, selectedPlayer ? styles.hintTextActive : null]}>
            {selectedPlayer
              ? `${selectedPlayer.name} selecionado — toque num reserva p/ substituir, ou outro titular p/ trocar de posição`
              : "Toque num jogador do campo para trocar de posição ou substituir"}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>RESERVAS ({benchIds.length})</Text>
          <View style={styles.list}>
            {benchIds.map((id) => {
              const p = byId.get(id);
              if (!p) return null;
              return (
                <Pressable
                  key={id}
                  onPress={() => subInFromBench(id)}
                  disabled={selectedSlot === null}
                  style={selectedSlot !== null ? styles.benchArmed : undefined}
                  accessibilityRole="button"
                >
                  <PlayerCard p={p} />
                  {selectedSlot !== null ? (
                    <View style={styles.enterBadge}>
                      <Icon name="arrow-up" size={11} color={color.primaryContrast} />
                      <Text style={styles.enterText}>ENTRAR</Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.background },
  content: { padding: space.lg, gap: space.md, paddingBottom: space.xl4 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { color: color.text, fontSize: fontSize.xl2, fontWeight: fontWeight.black as "800", fontStyle: "italic", letterSpacing: 0.5 },
  subtitle: { color: color.primary, fontSize: fontSize.xs, fontWeight: fontWeight.bold as "700", letterSpacing: 0.5, marginTop: -2 },
  ovrPill: { alignItems: "center", borderWidth: 1, borderColor: color.borderStrong, borderRadius: radius.sm, paddingHorizontal: space.md, paddingVertical: space.xs },
  ovrLabel: { color: color.textMuted, fontSize: 8, fontWeight: fontWeight.bold as "700", letterSpacing: 0.5 },
  ovrValue: { color: color.primary, fontSize: fontSize.lg, fontWeight: fontWeight.black as "800", fontStyle: "italic" },
  formations: { gap: space.sm, paddingRight: space.lg },
  formationChip: {
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
  formationText: { color: color.textMuted, fontSize: fontSize.sm, fontWeight: fontWeight.black as "800", fontStyle: "italic", letterSpacing: 0.5 },
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
  hintActive: { borderColor: color.primaryDim, backgroundColor: "#131811" },
  hintText: { color: color.textMuted, fontSize: fontSize.xs, flex: 1, lineHeight: 16 },
  hintTextActive: { color: color.text },
  section: { gap: space.sm, marginTop: space.xs },
  sectionTitle: { color: color.textMuted, fontSize: fontSize.xs, fontWeight: fontWeight.black as "800", fontStyle: "italic", letterSpacing: 0.5 },
  list: { gap: space.sm },
  benchArmed: { borderRadius: radius.md, borderWidth: 1, borderColor: color.primaryDim },
  enterBadge: {
    position: "absolute",
    right: space.md,
    top: "50%",
    marginTop: -10,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: color.primary,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
  },
  enterText: { color: color.primaryContrast, fontSize: 9, fontWeight: fontWeight.black as "800", letterSpacing: 0.5 },
});
