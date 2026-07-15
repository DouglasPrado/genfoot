import { useMemo, useState, useCallback } from "react";
import { ScrollView, View, Text, Pressable, Modal, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@/components/icon";
import { color, space, radius, fontSize, fontWeight } from "@/theme";
import { SQUAD_SEED, type SquadPlayer } from "./squad-data";
import { FORMATIONS, FORMATION_KEYS, assignToFormation, type FormationKey } from "./formations";
import { Pitch } from "./pitch";
import { PlayerCard } from "./player-card";

/** Tela de Elenco: campo tático (formação editável) + modal de substituição. */
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
  const [activeSlot, setActiveSlot] = useState<number | null>(null);

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
      setActiveSlot(null);
    },
    [byId],
  );

  const closeSheet = useCallback(() => setActiveSlot(null), []);

  const substitute = useCallback(
    (benchPlayerId: string) => {
      if (activeSlot === null) return;
      const outgoing = onPitchIds[activeSlot];
      setOnPitchIds((prev) => {
        const next = [...prev];
        next[activeSlot] = benchPlayerId;
        return next;
      });
      setBenchIds((b) => b.map((id) => (id === benchPlayerId ? (outgoing ?? id) : id)));
      setActiveSlot(null);
    },
    [activeSlot, onPitchIds],
  );

  const outgoing = activeSlot !== null ? byId.get(onPitchIds[activeSlot] ?? "") : undefined;
  const outgoingRole = activeSlot !== null ? slots[activeSlot]?.role : undefined;

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
          selectedSlot={activeSlot}
          onSelectSlot={setActiveSlot}
        />

        <View style={styles.hint}>
          <Icon name="swap-horizontal" size={14} color={color.textMuted} />
          <Text style={styles.hintText}>Toque num jogador do campo para substituir · {benchIds.length} reservas</Text>
        </View>
      </ScrollView>

      <Modal visible={activeSlot !== null} transparent animationType="slide" onRequestClose={closeSheet}>
        <Pressable style={styles.backdrop} onPress={closeSheet} />
        <View style={styles.sheet}>
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
            <Pressable onPress={closeSheet} hitSlop={8} accessibilityRole="button" style={styles.closeBtn}>
              <Icon name="remove" size={18} color={color.text} />
            </Pressable>
          </View>
          <Text style={styles.sheetSection}>ENTRA — RESERVAS ({benchIds.length})</Text>
          <ScrollView contentContainerStyle={styles.sheetList} showsVerticalScrollIndicator={false}>
            {benchIds.length === 0 ? (
              <Text style={styles.empty}>Sem reservas disponíveis.</Text>
            ) : (
              benchIds.map((id) => {
                const p = byId.get(id);
                if (!p) return null;
                return (
                  <Pressable key={id} onPress={() => substitute(id)} accessibilityRole="button" style={styles.benchRow}>
                    <PlayerCard p={p} />
                    <View style={styles.enterBadge}>
                      <Icon name="arrow-up" size={12} color={color.primaryContrast} />
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
  hintText: { color: color.textMuted, fontSize: fontSize.xs, flex: 1 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.6)" },
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
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: color.borderStrong, marginBottom: space.md },
  sheetHeader: { flexDirection: "row", alignItems: "center", marginBottom: space.md },
  sheetTitle: { color: color.text, fontSize: fontSize.lg, fontWeight: fontWeight.black as "800", fontStyle: "italic", letterSpacing: 0.5 },
  sheetSub: { color: color.textMuted, fontSize: fontSize.xs, marginTop: 1 },
  sheetOut: { color: color.danger, fontWeight: fontWeight.bold as "700" },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, alignItems: "center", justifyContent: "center" },
  sheetSection: { color: color.primary, fontSize: fontSize.xs, fontWeight: fontWeight.black as "800", fontStyle: "italic", letterSpacing: 0.5, marginBottom: space.sm },
  sheetList: { gap: space.sm },
  empty: { color: color.textMuted, fontSize: fontSize.sm, textAlign: "center", paddingVertical: space.xl },
  benchRow: {},
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
  enterText: { color: color.primaryContrast, fontSize: 10, fontWeight: fontWeight.black as "800", letterSpacing: 0.5 },
});
