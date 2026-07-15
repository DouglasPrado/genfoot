import { View, Text, StyleSheet } from "react-native";
import { Icon, type IconName } from "@/components/icon";
import { color, space, radius, fontSize, fontWeight } from "@/theme";

const CARDS = [
  { rating: 97, pos: "CA", name: "MBAPPÉ" },
  { rating: 96, pos: "MAT", name: "BELLINGHAM" },
  { rating: 96, pos: "PTD", name: "VINÍCIUS JR." },
];

/** Banner promocional "Pacote épico Show Time" com mini-cards de jogadores. */
export function PackBanner() {
  return (
    <View style={styles.root}>
      <View style={styles.copy}>
        <Text style={styles.kicker}>PACOTE ÉPICO</Text>
        <Text style={styles.title}>SHOW TIME</Text>
        <Text style={styles.sub}>GARANTA JOGADORES DESTAQUE!</Text>
      </View>
      <View style={styles.cards}>
        {CARDS.map((c) => (
          <View key={c.name} style={styles.card}>
            <Text style={styles.rating}>{c.rating}</Text>
            <Text style={styles.pos}>{c.pos}</Text>
            <Icon name="person" size={20} color={color.textMuted} />
            <Text style={styles.cardName} numberOfLines={1}>
              {c.name}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    gap: space.md,
    backgroundColor: color.surface,
    borderColor: color.primaryDim,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.lg,
    overflow: "hidden",
  },
  copy: { flex: 1, justifyContent: "center" },
  kicker: { color: color.text, fontSize: fontSize.md, fontWeight: fontWeight.bold as "700", fontStyle: "italic" },
  title: {
    color: color.primary,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
    letterSpacing: 0.5,
  },
  sub: { color: color.textMuted, fontSize: fontSize.xs, fontWeight: fontWeight.semibold as "600", marginTop: 2 },
  cards: { flexDirection: "row", gap: space.xs },
  card: {
    width: 52,
    alignItems: "center",
    backgroundColor: color.backgroundElevated,
    borderColor: color.borderStrong,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingVertical: space.xs,
    gap: 1,
  },
  rating: { color: color.primary, fontSize: fontSize.md, fontWeight: fontWeight.black as "800", fontStyle: "italic" },
  pos: { color: color.textMuted, fontSize: 9, fontWeight: fontWeight.bold as "700" },
  cardName: { color: color.text, fontSize: 8, fontWeight: fontWeight.bold as "700" },
});
