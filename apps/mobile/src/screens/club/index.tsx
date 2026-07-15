import { ScrollView, View, Text, StyleSheet } from "react-native";
import { Icon, type IconName } from "@/components/icon";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card, SectionHeader } from "@/components/card";
import { ProgressBar } from "@/components/progress-bar";
import { color, space, radius, fontSize, fontWeight, formatAmount } from "@/theme";
import { CLUB_SEED } from "./club-data";

type IoniconName = IconName;

function FinanceRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.finRow}>
      <Text style={styles.finLabel}>{label}</Text>
      <Text style={[styles.finValue, strong ? styles.finStrong : null]}>{value}</Text>
    </View>
  );
}

/** Tela de Clube: identidade, finanças e infraestrutura. */
export function Club() {
  const vm = CLUB_SEED;
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.crest}>
            <Text style={styles.crestInitial}>{vm.name.charAt(0)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{vm.name}</Text>
            <Text style={styles.subtitle}>DIVISÃO {vm.division} · {vm.stadium.name}</Text>
            <View style={styles.repRow}>
              <Text style={styles.repLabel}>REPUTAÇÃO</Text>
              <View style={styles.repBar}>
                <ProgressBar value={vm.reputation / 100} height={5} />
              </View>
            </View>
          </View>
        </View>

        <Card>
          <SectionHeader title="FINANÇAS" trailing={<Icon name="wallet" size={16} color={color.textMuted} />} />
          <View style={styles.finGrid}>
            <View style={styles.finBox}>
              <Text style={styles.finBoxLabel}>SALDO</Text>
              <Text style={styles.finBoxValue}>{vm.finances.balanceLabel}</Text>
            </View>
            <View style={styles.finBox}>
              <Text style={styles.finBoxLabel}>ORÇAMENTO DE TRANSFERÊNCIAS</Text>
              <Text style={styles.finBoxValue}>{vm.finances.transferBudgetLabel}</Text>
            </View>
          </View>
          <View style={styles.wageBlock}>
            <FinanceRow label="Folha salarial" value={vm.finances.wageBudgetLabel} />
            <ProgressBar value={vm.finances.wageUsedPct / 100} tint={vm.finances.wageUsedPct > 90 ? color.danger : color.primary} height={5} />
            <Text style={styles.wageNote}>{vm.finances.wageUsedPct}% do teto usado</Text>
          </View>
          <View style={styles.flowRow}>
            <View style={styles.flowItem}>
              <Icon name="arrow-up-circle" size={14} color={color.success} />
              <Text style={styles.flowLabel}>Receita</Text>
              <Text style={styles.flowValue}>{vm.finances.incomeLabel}</Text>
            </View>
            <View style={styles.flowItem}>
              <Icon name="arrow-down-circle" size={14} color={color.danger} />
              <Text style={styles.flowLabel}>Despesa</Text>
              <Text style={styles.flowValue}>{vm.finances.expenseLabel}</Text>
            </View>
          </View>
        </Card>

        <Card>
          <SectionHeader title="INFRAESTRUTURA" trailing={<Icon name="construct" size={16} color={color.textMuted} />} />
          <View style={styles.infraList}>
            {vm.infrastructure.map((infra) => (
              <View key={infra.id} style={styles.infraRow}>
                <View style={styles.infraIcon}>
                  <Icon name={infra.icon as IoniconName} size={18} color={color.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infraName}>{infra.name}</Text>
                  <Text style={styles.infraNote}>{infra.note}</Text>
                </View>
                <View style={styles.levels}>
                  {Array.from({ length: infra.maxLevel }).map((_, i) => (
                    <View key={i} style={[styles.pip, { backgroundColor: i < infra.level ? color.primary : color.surfaceRaised }]} />
                  ))}
                </View>
              </View>
            ))}
          </View>
        </Card>

        <Card>
          <SectionHeader title="ESTÁDIO" trailing={<Icon name="business" size={16} color={color.textMuted} />} />
          <View style={styles.stadiumRow}>
            <Text style={styles.stadiumName}>{vm.stadium.name}</Text>
            <Text style={styles.stadiumCap}>{formatAmount(vm.stadium.capacity)} lugares</Text>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.background },
  content: { padding: space.lg, gap: space.lg, paddingBottom: space.xl4 },
  hero: { flexDirection: "row", alignItems: "center", gap: space.md },
  crest: {
    width: 60,
    height: 68,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: color.primary,
    backgroundColor: color.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  crestInitial: { color: color.primary, fontSize: fontSize.xl2, fontWeight: fontWeight.black as "800", fontStyle: "italic" },
  title: { color: color.text, fontSize: fontSize.xl2, fontWeight: fontWeight.black as "800", fontStyle: "italic", letterSpacing: 0.5 },
  subtitle: { color: color.textMuted, fontSize: fontSize.xs, fontWeight: fontWeight.semibold as "600", marginTop: 1 },
  repRow: { flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: space.sm },
  repLabel: { color: color.textMuted, fontSize: 9, fontWeight: fontWeight.bold as "700", letterSpacing: 0.5 },
  repBar: { flex: 1 },
  finGrid: { flexDirection: "row", gap: space.sm },
  finBox: { flex: 1, backgroundColor: color.backgroundElevated, borderRadius: radius.sm, padding: space.md, gap: 2 },
  finBoxLabel: { color: color.textMuted, fontSize: 9, fontWeight: fontWeight.bold as "700", letterSpacing: 0.3 },
  finBoxValue: { color: color.text, fontSize: fontSize.lg, fontWeight: fontWeight.black as "800", fontStyle: "italic" },
  wageBlock: { marginTop: space.md, gap: 4 },
  finRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  finLabel: { color: color.textMuted, fontSize: fontSize.xs, fontWeight: fontWeight.semibold as "600" },
  finValue: { color: color.text, fontSize: fontSize.sm, fontWeight: fontWeight.bold as "700" },
  finStrong: { fontWeight: fontWeight.black as "800", fontStyle: "italic" },
  wageNote: { color: color.textMuted, fontSize: 9, fontWeight: fontWeight.semibold as "600" },
  flowRow: { flexDirection: "row", gap: space.sm, marginTop: space.md },
  flowItem: { flex: 1, flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: color.backgroundElevated, borderRadius: radius.sm, padding: space.sm },
  flowLabel: { color: color.textMuted, fontSize: 10, flex: 1 },
  flowValue: { color: color.text, fontSize: fontSize.xs, fontWeight: fontWeight.bold as "700" },
  infraList: { gap: space.md },
  infraRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  infraIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: color.primaryDim,
    alignItems: "center",
    justifyContent: "center",
  },
  infraName: { color: color.text, fontSize: fontSize.sm, fontWeight: fontWeight.bold as "700" },
  infraNote: { color: color.textMuted, fontSize: 10, marginTop: 1 },
  levels: { flexDirection: "row", gap: 3 },
  pip: { width: 8, height: 8, borderRadius: 2 },
  stadiumRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  stadiumName: { color: color.text, fontSize: fontSize.md, fontWeight: fontWeight.bold as "700", fontStyle: "italic" },
  stadiumCap: { color: color.textMuted, fontSize: fontSize.sm, fontWeight: fontWeight.semibold as "600" },
});
