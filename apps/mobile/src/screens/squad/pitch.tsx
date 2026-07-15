import { View, Text, Pressable, StyleSheet } from "react-native";
import Svg, { Rect, Line, Circle } from "react-native-svg";
import { color, radius, fontWeight } from "@/theme";
import type { SquadPlayer, PositionGroup } from "./squad-data";
import type { Slot } from "./formations";

const GROUP_TINT: Record<PositionGroup, string> = {
  GOL: color.energy,
  DEF: color.info,
  MEI: color.primary,
  ATA: color.home,
};

const FIELD = "#0d1912";
const LINE = "rgba(255,255,255,0.16)";

/** Fundo do campo desenhado em SVG (ataque para cima). viewBox 100×140. */
function Field() {
  return (
    <Svg style={StyleSheet.absoluteFill} viewBox="0 0 100 140" preserveAspectRatio="none">
      <Rect x={0} y={0} width={100} height={140} fill={FIELD} />
      <Rect x={3} y={3} width={94} height={134} fill="none" stroke={LINE} strokeWidth={0.7} />
      <Line x1={3} y1={70} x2={97} y2={70} stroke={LINE} strokeWidth={0.7} />
      <Circle cx={50} cy={70} r={9} fill="none" stroke={LINE} strokeWidth={0.7} />
      <Circle cx={50} cy={70} r={0.9} fill={LINE} />
      {/* Gol adversário (topo) */}
      <Rect x={26} y={3} width={48} height={15} fill="none" stroke={LINE} strokeWidth={0.7} />
      <Rect x={38} y={3} width={24} height={6} fill="none" stroke={LINE} strokeWidth={0.7} />
      {/* Gol próprio (base) */}
      <Rect x={26} y={122} width={48} height={15} fill="none" stroke={LINE} strokeWidth={0.7} />
      <Rect x={38} y={131} width={24} height={6} fill="none" stroke={LINE} strokeWidth={0.7} />
    </Svg>
  );
}

function Token({
  player,
  slot,
  selected,
  onPress,
}: {
  player: SquadPlayer | undefined;
  slot: Slot;
  selected: boolean;
  onPress: () => void;
}) {
  const tint = GROUP_TINT[slot.group];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[
        styles.token,
        { left: `${slot.x * 100}%`, top: `${slot.y * 100}%` },
      ]}
    >
      <View style={[styles.badge, { borderColor: selected ? color.primary : tint }, selected ? styles.badgeSelected : null]}>
        <Text style={styles.number}>{player?.number ?? "?"}</Text>
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {player ? player.name.split(" ").slice(-1)[0] : slot.role}
      </Text>
    </Pressable>
  );
}

/** Campo com a formação: 11 tokens posicionados, tocáveis para escalar/substituir. */
export function Pitch({
  slots,
  playerIds,
  playerById,
  selectedSlot,
  onSelectSlot,
}: {
  slots: readonly Slot[];
  playerIds: readonly string[];
  playerById: (id: string) => SquadPlayer | undefined;
  selectedSlot: number | null;
  onSelectSlot: (index: number) => void;
}) {
  return (
    <View style={styles.pitch}>
      <Field />
      {slots.map((slot, i) => {
        const id = playerIds[i];
        return (
          <Token
            key={`${slot.role}-${i}`}
            slot={slot}
            player={id ? playerById(id) : undefined}
            selected={selectedSlot === i}
            onPress={() => onSelectSlot(i)}
          />
        );
      })}
    </View>
  );
}

const TOKEN = 46;
const styles = StyleSheet.create({
  pitch: {
    width: "100%",
    aspectRatio: 100 / 140,
    borderRadius: radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: color.border,
  },
  token: {
    position: "absolute",
    width: TOKEN,
    marginLeft: -TOKEN / 2,
    marginTop: -TOKEN / 2,
    alignItems: "center",
  },
  badge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    backgroundColor: "rgba(10,11,13,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeSelected: { backgroundColor: "#151c0e", transform: [{ scale: 1.12 }] },
  number: { color: color.text, fontSize: 15, fontWeight: fontWeight.black as "800", fontStyle: "italic" },
  name: {
    color: color.text,
    fontSize: 9,
    fontWeight: fontWeight.bold as "700",
    marginTop: 2,
    maxWidth: TOKEN + 12,
    textAlign: "center",
  },
});
