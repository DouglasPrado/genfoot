import { View, Text, Pressable, StyleSheet } from "react-native";
import Svg, {
  Polygon,
  Line,
  Ellipse,
  Defs,
  LinearGradient,
  Stop,
} from "react-native-svg";
import { Icon } from "@/components/icon";
import { PlayerAvatar } from "@/components/player-avatar";
import { color, radius, fontWeight } from "@/theme";
import { isMedicalBlock, lineupBlock } from "./availability-model";
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

// Sem compressão: jogadores espalhados por todo o campo (distantes).
const COMPRESS_Y = 1;
const COMPRESS_X = 1;

/** Projeta coords normalizadas do slot no trapézio em perspectiva (comprimido). */
function project(
  nx: number,
  ny: number,
): { xv: number; yv: number; depth: number } {
  const nyc = 0.5 + (ny - 0.5) * COMPRESS_Y;
  const nxc = 0.5 + (nx - 0.5) * COMPRESS_X;
  const yv = lerp(TOP_Y, BOT_Y, nyc);
  const leftX = lerp(TOP_L, BOT_L, nyc);
  const rightX = lerp(TOP_R, BOT_R, nyc);
  const xv = leftX + nxc * (rightX - leftX);
  return { xv, yv, depth: nyc };
}

function stripe(y0: number, y1: number, fill: string) {
  const l0 = lerp(TOP_L, BOT_L, (y0 - TOP_Y) / (BOT_Y - TOP_Y));
  const r0 = lerp(TOP_R, BOT_R, (y0 - TOP_Y) / (BOT_Y - TOP_Y));
  const l1 = lerp(TOP_L, BOT_L, (y1 - TOP_Y) / (BOT_Y - TOP_Y));
  const r1 = lerp(TOP_R, BOT_R, (y1 - TOP_Y) / (BOT_Y - TOP_Y));
  return (
    <Polygon
      key={y0}
      points={`${l0},${y0} ${r0},${y0} ${r1},${y1} ${l1},${y1}`}
      fill={fill}
    />
  );
}

/** Campo em perspectiva (trapézio), grama clara com listras e linhas brancas. */
function Field() {
  const bands = 6;
  const step = (BOT_Y - TOP_Y) / bands;
  return (
    <Svg
      style={StyleSheet.absoluteFill}
      viewBox="0 0 100 140"
      preserveAspectRatio="none"
    >
      <Defs>
        <LinearGradient id="grass" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#3fa85f" />
          <Stop offset="1" stopColor="#55c878" />
        </LinearGradient>
      </Defs>
      <Polygon
        points={`${TOP_L},${TOP_Y} ${TOP_R},${TOP_Y} ${BOT_R},${BOT_Y} ${BOT_L},${BOT_Y}`}
        fill="url(#grass)"
      />
      {Array.from({ length: bands }).map((_, i) =>
        i % 2 === 0
          ? stripe(
              TOP_Y + i * step,
              TOP_Y + (i + 1) * step,
              "rgba(255,255,255,0.05)",
            )
          : null,
      )}
      {/* Contorno */}
      <Polygon
        points={`${TOP_L},${TOP_Y} ${TOP_R},${TOP_Y} ${BOT_R},${BOT_Y} ${BOT_L},${BOT_Y}`}
        fill="none"
        stroke={LINE}
        strokeWidth={0.8}
      />
      {/* Meio-campo + círculo central (elipse achatada pela perspectiva) */}
      <Line
        x1={lerp(TOP_L, BOT_L, 0.5)}
        y1={70}
        x2={lerp(TOP_R, BOT_R, 0.5)}
        y2={70}
        stroke={LINE}
        strokeWidth={0.8}
      />
      <Ellipse
        cx={50}
        cy={70}
        rx={11}
        ry={5.5}
        fill="none"
        stroke={LINE}
        strokeWidth={0.8}
      />
      {/* Gol adversário (topo, longe) */}
      <Polygon
        points="31,4 69,4 72,22 28,22"
        fill="none"
        stroke={LINE}
        strokeWidth={0.8}
      />
      <Polygon
        points="39,4 61,4 62,11 38,11"
        fill="none"
        stroke={LINE}
        strokeWidth={0.8}
      />
      {/* Gol próprio (base, perto) */}
      <Polygon
        points="16,112 84,112 90,136 10,136"
        fill="none"
        stroke={LINE}
        strokeWidth={0.8}
      />
      <Polygon
        points="35,127 65,127 68,136 32,136"
        fill="none"
        stroke={LINE}
        strokeWidth={0.8}
      />
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
  const scale = lerp(0.9, 1.16, depth);
  const fit = player?.fitness ?? 0;
  // Impedimento do jogador escalado. Amarelo é o médico (lesão/recuperação);
  // os demais (suspenso, convocado, em treino) ficam neutros pra não competir.
  const block = player ? lineupBlock(player.availability) : null;
  const medical = isMedicalBlock(block);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        player === undefined
          ? `Posição ${slot.role} vazia`
          : `${player.name}, ${slot.role}, overall ${player.ovr}${
              block === null ? "" : `. ${block.reason}`
            }`
      }
      accessibilityState={{ selected }}
      style={[
        styles.token,
        { left: `${xv}%`, top: `${(yv / 140) * 100}%`, transform: [{ scale }] },
      ]}
    >
      <View
        style={[
          styles.photo,
          {
            borderColor: medical
              ? color.warning
              : selected
                ? color.primary
                : tint,
          },
          selected ? styles.photoSelected : null,
        ]}
      >
        {player ? (
          <PlayerAvatar size={PHOTO - 4} radius={(PHOTO - 4) / 2} />
        ) : null}
        {block === null ? null : (
          <View
            style={[
              styles.blockBadge,
              medical ? styles.blockBadgeMedical : styles.blockBadgeNeutral,
            ]}
          >
            <Icon
              name={medical ? "medkit" : "warning"}
              size={11}
              color={medical ? color.warning : color.textMuted}
            />
          </View>
        )}
        <View style={styles.numberBadge}>
          <Text style={styles.numberText}>{player?.number ?? "?"}</Text>
        </View>
        <View style={[styles.roleBadge, { borderColor: tint }]}>
          <Text style={[styles.roleText, { color: tint }]}>{slot.role}</Text>
        </View>
        <View style={[styles.ovrBadge, { borderColor: tint }]}>
          <Text style={styles.ovrText}>{player?.ovr ?? "—"}</Text>
        </View>
      </View>
      <View style={styles.fitTrack}>
        <View
          style={{
            width: `${fit}%`,
            height: 4,
            backgroundColor: fitnessTint(fit),
            borderRadius: 2,
          }}
        />
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

const TOKEN = 56;
const PHOTO = 44;
const styles = StyleSheet.create({
  pitch: {
    width: "100%",
    aspectRatio: 100 / 134,
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
    minWidth: 19,
    height: 19,
    borderRadius: 9.5,
    paddingHorizontal: 3,
    backgroundColor: color.backgroundElevated,
    borderWidth: 1,
    borderColor: color.border,
    alignItems: "center",
    justifyContent: "center",
  },
  numberText: {
    color: color.text,
    fontSize: 11,
    fontWeight: fontWeight.black as "800",
  },
  // Canto inferior-esquerdo da foto: livre do número (topo-esq), da função
  // (topo-dir) e do OVR (base, centrado em 9..35 dos 44px da foto).
  blockBadge: {
    position: "absolute",
    bottom: -4,
    left: -10,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  blockBadgeMedical: {
    backgroundColor: "#2a2109",
    borderColor: color.warning,
  },
  blockBadgeNeutral: {
    backgroundColor: color.backgroundElevated,
    borderColor: color.border,
  },
  ovrBadge: {
    position: "absolute",
    bottom: -7,
    minWidth: 26,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: color.background,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  ovrText: {
    color: color.text,
    fontSize: 11,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
  },
  fitTrack: {
    width: PHOTO - 8,
    height: 4,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 2,
    marginTop: 5,
    overflow: "hidden",
  },
  roleBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    borderRadius: 5,
    borderWidth: 1,
    paddingHorizontal: 3,
    paddingVertical: 1,
    backgroundColor: "rgba(10,11,13,0.92)",
  },
  roleText: {
    fontSize: 8,
    fontWeight: fontWeight.black as "800",
    letterSpacing: 0.3,
  },
  name: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: fontWeight.bold as "700",
    marginTop: 2,
    maxWidth: TOKEN + 14,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowRadius: 3,
  },
});
