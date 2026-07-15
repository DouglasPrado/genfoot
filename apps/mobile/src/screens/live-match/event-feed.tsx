import { View, Text, StyleSheet } from "react-native";
import { Icon, type IconName } from "@/components/icon";
import { Card, SectionHeader } from "@/components/card";
import { color, space, radius, fontSize, fontWeight } from "@/theme";
import type { MatchViewModel, EventKind } from "./match-data";

const KIND: Record<EventKind, { icon: IconName; tint: string }> = {
  goal: { icon: "football", tint: color.primary },
  sub: { icon: "swap-horizontal", tint: color.info },
  possession: { icon: "arrow-down", tint: color.danger },
  whistle: { icon: "time", tint: color.warning },
};

/** Feed de eventos da partida (timeline), com o mais recente em destaque. */
export function EventFeed({ events }: { events: MatchViewModel["events"] }) {
  return (
    <Card>
      <SectionHeader title="FEED DE EVENTOS" />
      <View style={styles.list}>
        {events.map((e) => {
          const k = KIND[e.kind];
          return (
            <View key={e.id} style={[styles.row, e.highlight ? styles.rowHighlight : null]}>
              <View style={[styles.iconWrap, { borderColor: k.tint }]}>
                <Icon name={k.icon} size={16} color={k.tint} />
              </View>
              <Text style={styles.minute}>{e.minute}'</Text>
              <View style={styles.body}>
                <Text style={styles.title}>
                  {e.highlight ? <Text style={{ color: color.primary }}>{e.title}</Text> : e.title}
                </Text>
                {e.detail ? <Text style={styles.detail}>{e.detail}</Text> : null}
              </View>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: color.backgroundElevated,
    borderRadius: radius.sm,
    padding: space.md,
  },
  rowHighlight: { borderWidth: 1, borderColor: color.primaryDim, backgroundColor: "#151c0e" },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  minute: { color: color.text, fontSize: fontSize.md, fontWeight: fontWeight.black as "800", fontStyle: "italic", minWidth: 34 },
  body: { flex: 1 },
  title: { color: color.text, fontSize: fontSize.sm, fontWeight: fontWeight.bold as "700" },
  detail: { color: color.textMuted, fontSize: fontSize.xs, marginTop: 2, lineHeight: 16 },
});
