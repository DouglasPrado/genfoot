import { View, Text, Pressable, StyleSheet } from "react-native";
import Svg, { Polygon, Line, Ellipse, Defs, LinearGradient, Stop } from "react-native-svg";
import { Icon } from "@/components/icon";
import { color, radius, fontWeight } from "@/theme";
import type { SquadPlayer, PositionGroup } from "./squad-data";
import type { Slot } from "./formations";

const GROUP_TINT: Record<PositionGroup, string> = {
  GOL: color.energy,
  DEF: color.info,
  MEI: color.primary,
  ATA: color.home,
};

const LINE = "rgba(255,255,255,0.5)";
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Trapézio do campo (viewBox 100×140): topo estreito (longe), base larga (perto).
const TOP_L = 18;
const TOP_R = 82;
const BOT_L = 2;
const BOT_R = 98;
const TOP_Y = 4;
const BOT_Y = 136;

/** Projeta coords normalizadas do slot no trapézio em perspectiva. */
function project(nx: number, ny: number): { xv: number; yv: number; depth: number } {
  const yv = lerp(TOP_Y, BOT_Y, ny);
  const leftX = lerp(TOP_L, BOT_L, ny);
  const rightX = lerp(TOP_R, BOT_R, ny);
  const xv = leftX + nx * (rightX - leftX);
  return { xv, yv, depth: ny };
}

function stripe(y0: number, y1: number, fill: string) {
  const l0 = lerp(TOP_L, BOT_L, (y0 - TOP_Y) / (BOT_Y - TOP_Y));
  const r0 = lerp(TOP_R, BOT_R, (y0 - TOP_Y) / (BOT_Y - TOP_Y));
  const l1 = lerp(TOP_L, BOT_L, (y1 - TOP_Y) / (BOT_Y - TOP_Y));
  const r1 = lerp(TOP_R, BOT_R, (y1 - TOP_Y) / (BOT_Y - TOP_Y));
  return <Polygon key={y0} points={`${l0},${y0} ${r0},${y0} ${r1},${y1} ${l1},${y1}`} fill={fill} />;
}

/** Campo em perspectiva (trapézio), grama clara com listras e linhas brancas. */
function Field() {
  const bands = 6;
  const step = (BOT_Y - TOP_Y) / bands;
  return (
    <Svg style={StyleSheet.absoluteFill} viewBox="0 0 100 140" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id="grass" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#2b6a41" />
          <Stop offset="1" stopColor="#3a8354" />
        </LinearGradient>
      </Defs>
      <Polygon points={`${TOP_L},${TOP_Y} ${TOP_R},${TOP_Y} ${BOT_R},${BOT_Y} ${BOT_L},${BOT_Y}`} fill="url(#grass)" />
      {Array.from({ length: bands }).map((_, i) =>
        i % 2 === 0 ? stripe(TOP_Y + i * step, TOP_Y + (i + 1) * step, "rgba(255,255,255,0.05)") : null,
      )}
      {/* Contorno */}
      <Polygon
        points={`${TOP_L},${TOP_Y} ${TOP_R},${TOP_Y} ${BOT_R},${BOT_Y} ${BOT_L},${BOT_Y}`}
        fill="none"
        stroke={LINE}
        strokeWidth={0.8}
      />
      {/* Meio-campo + círculo central (elipse achatada pela perspectiva) */}
      <Line x1={lerp(TOP_L, BOT_L, 0.5)} y1={70} x2={lerp(TOP_R, BOT_R, 0.5)} y2={70} stroke={LINE} strokeWidth={0.8} />
      <Ellipse cx={50} cy={70} rx={11} ry={5.5} fill="none" stroke={LINE} strokeWidth={0.8} />
      {/* Gol adversário (topo, longe) */}
      <Polygon points="31,4 69,4 72,22 28,22" fill="none" stroke={LINE} strokeWidth={0.8} />
      <Polygon points="39,4 61,4 62,11 38,11" fill="none" stroke={LINE} strokeWidth={0.8} />
      {/* Gol próprio (base, perto) */}
      <Polygon points="16,112 84,112 90,136 10,136" fill="none" stroke={LINE} strokeWidth={0.8} />
      <Polygon points="35,127 65,127 68,136 32,136" fill="none" stroke={LINE} strokeWidth={0.8} />
    </Svg>
  );
}

function fitnessTint(v: number): string {
  return v >= 85 ? color.success : v >= 65 ? color.warning : color.danger;
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
  const { xv, yv, depth } = project(slot.x, slot.y);
  const scale = lerp(0.82, 1.14, depth);
  const fit = player?.fitness ?? 0;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[styles.token, { left: `${xv}%`, top: `${(yv / 140) * 100}%`, transform: [{ scale }] }]}
    >
      <View style={[styles.photo, { borderColor: selected ? color.primary : tint }, selected ? styles.photoSelected : null]}>
        <Icon name="person" size={20} color={color.textMuted} />
        <View style={styles.numberBadge}>
          <Text style={styles.numberText}>{player?.number ?? "?"}</Text>
        </View>
        <View style={[styles.ovrBadge, { borderColor: tint }]}>
          <Text style={styles.ovrText}>{player?.ovr ?? "—"}</Text>
        </View>
      </View>
      <View style={styles.fitTrack}>
        <View style={{ width: `${fit}%`, height: 3, backgroundColor: fitnessTint(fit), borderRadius: 2 }} />
      </View>
      <View style={[styles.roleChip, { borderColor: tint }]}>
        <Text style={[styles.roleText, { color: tint }]}>{slot.role}</Text>
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {player ? player.name.split(" ").slice(-1)[0] : "—"}
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

const TOKEN = 52;
const PHOTO = 40;
const styles = StyleSheet.create({
  pitch: {
    width: "100%",
    aspectRatio: 100 / 140,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  token: {
    position: "absolute",
    width: TOKEN,
    marginLeft: -TOKEN / 2,
    marginTop: -PHOTO / 2,
    alignItems: "center",
  },
  photo: {
    width: PHOTO,
    height: PHOTO,
    borderRadius: PHOTO / 2,
    borderWidth: 2,
    backgroundColor: "rgba(10,11,13,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  photoSelected: { backgroundColor: "#151c0e" },
  numberBadge: {
    position: "absolute",
    top: -4,
    left: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 2,
    backgroundColor: color.backgroundElevated,
    borderWidth: 1,
    borderColor: color.border,
    alignItems: "center",
    justifyContent: "center",
  },
  numberText: { color: color.text, fontSize: 9, fontWeight: fontWeight.black as "800" },
  ovrBadge: {
    position: "absolute",
    bottom: -6,
    minWidth: 22,
    height: 15,
    borderRadius: 7.5,
    paddingHorizontal: 3,
    backgroundColor: color.background,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  ovrText: { color: color.text, fontSize: 9, fontWeight: fontWeight.black as "800", fontStyle: "italic" },
  fitTrack: { width: PHOTO - 6, height: 3, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 2, marginTop: 7, overflow: "hidden" },
  roleChip: {
    marginTop: 4,
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 1,
    backgroundColor: "rgba(10,11,13,0.85)",
  },
  roleText: {
    fontSize: 8,
    fontWeight: fontWeight.black as "800",
    letterSpacing: 0.4,
  },
  name: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: fontWeight.bold as "700",
    marginTop: 2,
    maxWidth: TOKEN + 14,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowRadius: 3,
  },
});
