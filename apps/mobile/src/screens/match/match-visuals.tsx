import { StyleSheet, Text, View } from "react-native";

import { Icon, type IconName } from "@/components/icon";
import { color, fontSize, fontWeight, radius, space } from "@/theme";

/**
 * As peças visuais de `M-POSTMATCH`, na linguagem do protótipo
 * (`docs/04-ui-ux/Prototipo/prototipo-simulador-partida.jpeg`).
 *
 * O protótipo é da partida AO VIVO, e a adaptação tem um problema de fundo: lá
 * o eixo é o AGORA (momentum, pressão, ações rápidas); aqui não existe agora —
 * o jogo acabou. Então o que era faixa de estado vira **comparação**, e o feed
 * vira **linha do tempo**: uma espinha vertical em que o placar muda.
 */

/** A cor de um lado: a identidade real do clube, com piso legível no escuro. */
export function sideColor(primary: string | null, fallback: string): string {
  if (primary === null) return fallback;
  // Cor igual ao fundo não marca lado nenhum — cai no acento do tema.
  return primary.toUpperCase() === "#0A0B0D" ? fallback : primary;
}

/**
 * Uma estatística como barra dividida: casa à esquerda, visitante à direita,
 * cada lado na cor do seu clube.
 *
 * Dois números soltos obrigam o leitor a comparar de cabeça. A barra entrega o
 * veredito antes da leitura — que é o trabalho desta tela.
 */
export function StatSplit({
  label,
  home,
  away,
  homeColor,
  awayColor,
  format,
}: {
  label: string;
  home: number;
  away: number;
  homeColor: string;
  awayColor: string;
  format?: (value: number) => string;
}) {
  const total = home + away;
  // Empate em zero divide ao meio: 0×0 não dá vantagem a ninguém.
  const homeShare = total === 0 ? 0.5 : home / total;
  const show = format ?? ((value: number) => String(value));

  return (
    <View style={styles.statBlock}>
      <View style={styles.statHead}>
        <Text style={[styles.statValue, { color: homeColor }]}>{show(home)}</Text>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={[styles.statValue, { color: awayColor }]}>{show(away)}</Text>
      </View>
      <View style={styles.statTrack}>
        <View
          style={[
            styles.statFill,
            { flex: Math.max(homeShare, 0.02), backgroundColor: homeColor },
          ]}
        />
        <View style={styles.statGap} />
        <View
          style={[
            styles.statFill,
            { flex: Math.max(1 - homeShare, 0.02), backgroundColor: awayColor },
          ]}
        />
      </View>
    </View>
  );
}

export type FeedMarkKind =
  | "goal"
  | "assist"
  | "yellow"
  | "red"
  | "other";

/** O tipo de evento vira a marca da linha do tempo. */
export function markKindOf(type: string): FeedMarkKind {
  if (type === "GOAL" || type === "OWN_GOAL" || type === "PENALTY_SCORED") {
    return "goal";
  }
  if (type === "ASSIST") return "assist";
  if (type === "YELLOW_CARD") return "yellow";
  if (type === "RED_CARD") return "red";
  return "other";
}

const MARK_ICON: Record<Exclude<FeedMarkKind, "yellow" | "red">, IconName> = {
  goal: "football",
  assist: "transfer",
  other: "ellipse",
};

/**
 * A marca do lance na espinha da linha do tempo.
 *
 * Cartão é desenhado como CARTÃO — um retângulo amarelo ou vermelho. Nenhum
 * ícone de biblioteca se lê tão rápido quanto a forma que a coisa tem no campo.
 */
export function FeedMark({ kind }: { kind: FeedMarkKind }) {
  if (kind === "yellow" || kind === "red") {
    return (
      <View style={styles.markRing}>
        <View
          style={[
            styles.card,
            { backgroundColor: kind === "yellow" ? color.warning : color.danger },
          ]}
        />
      </View>
    );
  }
  return (
    <View
      style={[styles.markRing, kind === "goal" && styles.markRingGoal]}
      accessible={false}
    >
      <Icon
        name={MARK_ICON[kind]}
        size={kind === "goal" ? 16 : 13}
        color={kind === "goal" ? color.primary : color.textMuted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  statBlock: { gap: space.xs, paddingVertical: space.sm },
  statHead: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: space.sm,
  },
  statValue: {
    minWidth: 52,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
  },
  statLabel: {
    flex: 1,
    textAlign: "center",
    color: color.textMuted,
    fontSize: fontSize.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statTrack: { flexDirection: "row", alignItems: "center", height: 6 },
  statFill: { height: 6, borderRadius: 3 },
  statGap: { width: 3 },

  markRing: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.surfaceRaised,
    borderWidth: 1,
    borderColor: color.border,
  },
  markRingGoal: { borderColor: color.primary },
  card: { width: 11, height: 15, borderRadius: 2 },
});
