import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, type Href } from "expo-router";
import { Card } from "@/components/card";
import { Icon, type IconName } from "@/components/icon";
import { color, fontSize, fontWeight, radius, space } from "@/theme";

/**
 * Hub do Elenco (M-SQUAD como raiz de "tudo do jogador"): menu de destinos para
 * as telas de gestão de jogadores — tática, mercado, base, médico e treino — no
 * estilo do menu vertical do protótipo. Aberto a partir do card ELENCO no Clube.
 *
 * Só entram como ATIVOS os destinos com tela real hoje. `SOON` fica vazio
 * enquanto não houver destino sem tela: um placeholder "EM BREVE" é honesto,
 * um link que leva a lugar nenhum não é.
 */
interface Destination {
  readonly key: string;
  readonly icon: IconName;
  readonly title: string;
  readonly note: string;
  readonly route: Href;
}

interface SoonDestination {
  readonly key: string;
  readonly icon: IconName;
  readonly title: string;
  readonly note: string;
}

const DESTINATIONS: readonly Destination[] = [
  {
    key: "elenco",
    icon: "people",
    title: "Elenco",
    note: "Todos os jogadores do time",
    route: "/elenco/lista",
  },
  {
    key: "tatica",
    icon: "grid",
    title: "Formação Tática",
    note: "Campo tático, formação e substituições",
    route: "/elenco/tatica",
  },
  {
    key: "mercado",
    icon: "transfer",
    title: "Mercado",
    note: "Contratações, vendas e observados",
    route: "/mercado",
  },
  {
    key: "comissao",
    icon: "people",
    title: "Comissão Técnica",
    note: "Técnico, olheiros, médico e mais",
    route: "/elenco/comissao",
  },
  {
    key: "treino",
    icon: "barbell",
    title: "Treino",
    note: "Plano do elenco, sessões individuais e conversa",
    route: "/elenco/treino",
  },
  {
    key: "base",
    icon: "school",
    title: "Base",
    note: "Jovens em formação e potencial",
    route: "/elenco/base",
  },
  {
    key: "medico",
    icon: "medkit",
    title: "Departamento Médico",
    note: "Lesões, reabilitação e retorno",
    route: "/elenco/medico",
  },
];

const SOON: readonly SoonDestination[] = [];

/** Menu-hub do Elenco: destinos ativos + placeholders honestos "em breve". */
export function ElencoHub() {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Voltar ao clube"
          hitSlop={8}
          style={styles.back}
        >
          <Icon name="arrow-back" size={22} color={color.text} />
        </Pressable>
        <Text style={styles.headerTitle}>ELENCO</Text>
        <View style={styles.back} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Card>
          {DESTINATIONS.map((d, i) => (
            <Pressable
              key={d.key}
              onPress={() => router.push(d.route)}
              accessibilityRole="button"
              accessibilityLabel={`Abrir ${d.title}`}
              style={[styles.row, i === 0 ? null : styles.rowDivider]}
            >
              <View style={styles.rowIcon}>
                <Icon name={d.icon} size={20} color={color.primary} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{d.title}</Text>
                <Text style={styles.rowNote}>{d.note}</Text>
              </View>
              <Icon name="chevron-forward" size={18} color={color.textMuted} />
            </Pressable>
          ))}
        </Card>

        <Text style={styles.soonLabel}>EM BREVE</Text>
        <Card>
          {SOON.map((d, i) => (
            <View
              key={d.key}
              style={[styles.row, styles.rowSoon, i === 0 ? null : styles.rowDivider]}
            >
              <View style={styles.rowIconSoon}>
                <Icon name={d.icon} size={20} color={color.textMuted} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitleSoon}>{d.title}</Text>
                <Text style={styles.rowNote}>{d.note}</Text>
              </View>
              <View style={styles.soonBadge}>
                <Text style={styles.soonBadgeText}>EM BREVE</Text>
              </View>
            </View>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  back: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  headerTitle: {
    color: color.text,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
    letterSpacing: 0.5,
  },
  content: { padding: space.lg, gap: space.md, paddingBottom: space.xl4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingVertical: space.md,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.border,
  },
  rowSoon: { opacity: 0.55 },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: color.primaryDim,
    alignItems: "center",
    justifyContent: "center",
  },
  rowIconSoon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: color.border,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: {
    color: color.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold as "700",
    fontStyle: "italic",
  },
  rowTitleSoon: {
    color: color.textMuted,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold as "700",
    fontStyle: "italic",
  },
  rowNote: { color: color.textMuted, fontSize: fontSize.xs },
  soonLabel: {
    color: color.textMuted,
    fontSize: 10,
    fontWeight: fontWeight.bold as "700",
    letterSpacing: 0.5,
    marginTop: space.sm,
    marginLeft: space.xs,
  },
  soonBadge: {
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
  },
  soonBadgeText: {
    color: color.textMuted,
    fontSize: 9,
    fontWeight: fontWeight.bold as "700",
    letterSpacing: 0.5,
  },
});
