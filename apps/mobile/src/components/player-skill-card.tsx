import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  type LayoutChangeEvent,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import {
  TECHNICAL_ATTRIBUTES,
  PHYSICAL_ATTRIBUTES,
  MENTAL_ATTRIBUTES,
  GOALKEEPING_ATTRIBUTES,
  attributeLabelPt,
} from "@grinta/core";
import { ProgressBar } from "@/components/progress-bar";
import { PlayerAvatar } from "@/components/player-avatar";
import { PositionBadge } from "@/components/position-badge";
import type { ClubCrestData } from "@/screens/club/customization/visual-identity";
import { color, space, radius, fontSize, fontWeight } from "@/theme";

/** Escudo do clube do jogador (template + cores + inicial). */
export type PlayerCardCrest = ClubCrestData;

/** Os 4 grupos reais (RosterView.groups), escala 0–100. */
export interface PlayerCardGroups {
  readonly technical: number;
  readonly physical: number;
  readonly mental: number;
  readonly goalkeeping: number | null;
}

/** Dado mínimo pra montar o card — genérico (elenco e mercado alimentam igual). */
export interface PlayerSkillCardData {
  readonly name: string;
  readonly number?: number | null;
  readonly position: string;
  readonly positionTint?: string;
  /** Foto do jogador; sem ela, cai no placeholder da silhueta. */
  readonly photoUrl?: string | null;
  /** Escudo do clube do jogador — sobreposto no canto da foto. */
  readonly crest?: PlayerCardCrest | null;
  readonly age: number;
  readonly ovr: number;
  readonly pot: number;
  readonly fitness?: number | null;
  readonly morale?: number | null;
  readonly groups: PlayerCardGroups | null;
  /** Os 39 atributos finos, por código. `null` se a query não trouxe. */
  readonly attributes?: Record<string, number | null> | null;
}

/** Rótulos PT dos 39 atributos (R-188). */
function tintFor(v: number): string {
  return v >= 80
    ? color.success
    : v >= 65
      ? color.primary
      : v >= 50
        ? color.warning
        : color.danger;
}

/** Barra larga de grupo (página resumo). */
function GroupBar({ label, value }: { label: string; value: number }) {
  const tint = tintFor(value);
  return (
    <View style={styles.groupRow}>
      <Text style={styles.groupLabel}>{label}</Text>
      <Text style={[styles.groupValue, { color: tint }]}>{value}</Text>
      <View style={styles.groupBar}>
        <ProgressBar value={value / 100} tint={tint} height={6} />
      </View>
    </View>
  );
}

/** Item compacto de atributo (2 colunas nas páginas detalhadas). */
function AttrItem({ code, value }: { code: string; value: number | null }) {
  const has = value !== null;
  const tint = has ? tintFor(value) : color.textFaint;
  return (
    <View style={styles.attrItem}>
      <View style={styles.attrHead}>
        <Text style={styles.attrLabel} numberOfLines={1}>
          {attributeLabelPt(code)}
        </Text>
        <Text style={[styles.attrValue, { color: tint }]}>
          {has ? value : "—"}
        </Text>
      </View>
      <ProgressBar value={has ? value / 100 : 0} tint={tint} height={5} />
    </View>
  );
}

interface Page {
  readonly key: string;
  readonly label: string;
  readonly codes: readonly string[] | null; // null = página resumo
}

/**
 * Card de jogador estilo FC — OVR/POT no topo e um PAGER horizontal que passa
 * pro lado: Resumo (4 grupos + fitness/moral) e, se a query trouxe os 39, uma
 * página por grupo (Técnico/Físico/Mental/Goleiro) com TODOS os atributos.
 * Reutilizável: elenco e mercado alimentam a mesma estrutura. Sem dado fictício.
 */
export function PlayerSkillCard({ data }: { data: PlayerSkillCardData }) {
  const posTint = data.positionTint ?? color.primary;
  const g = data.groups;
  const attrs = data.attributes ?? null;
  const isGk =
    (g?.goalkeeping ?? null) !== null ||
    (attrs?.goalkeeperReflexes ?? null) !== null;

  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);

  const pages: Page[] = [{ key: "resumo", label: "RESUMO", codes: null }];
  if (attrs !== null) {
    pages.push({ key: "tec", label: "TÉCNICO", codes: TECHNICAL_ATTRIBUTES });
    pages.push({ key: "fis", label: "FÍSICO", codes: PHYSICAL_ATTRIBUTES });
    pages.push({ key: "men", label: "MENTAL", codes: MENTAL_ATTRIBUTES });
    if (isGk) {
      pages.push({ key: "gol", label: "GOLEIRO", codes: GOALKEEPING_ATTRIBUTES });
    }
  }

  const onLayout = (e: LayoutChangeEvent) =>
    setWidth(e.nativeEvent.layout.width);
  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width > 0) {
      setPage(Math.round(e.nativeEvent.contentOffset.x / width));
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.hero}>
        <View style={styles.avatarWrap}>
          <PlayerAvatar
            photoUrl={data.photoUrl}
            crest={data.crest}
            ovr={data.ovr}
            size={76}
            radius={radius.md}
            crestSize={28}
            style={styles.avatar}
          />
        </View>
        <View style={styles.heroInfo}>
          <View style={styles.nameRow}>
            <PositionBadge label={data.position} tint={posTint} />
            <Text style={styles.name} numberOfLines={2}>
              {data.name}
            </Text>
          </View>
          <Text style={styles.heroMeta}>
            {data.number != null ? `#${data.number} · ` : ""}
            {data.age} anos
          </Text>
          <View style={styles.potRow}>
            <Text style={styles.potLabel}>POTENCIAL</Text>
            <Text style={styles.potValue}>{data.pot}</Text>
            {data.pot > data.ovr ? (
              <Text style={styles.potDelta}>+{data.pot - data.ovr}</Text>
            ) : null}
          </View>
        </View>
      </View>

      {/* Abas de página */}
      <View style={styles.tabs}>
        {pages.map((p, i) => (
          <View
            key={p.key}
            style={[styles.tab, i === page ? styles.tabActive : null]}
          >
            <Text
              style={[styles.tabText, i === page ? styles.tabTextActive : null]}
            >
              {p.label}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.divider} />

      {g === null && attrs === null ? (
        <Text style={styles.missing}>
          Atributos detalhados indisponíveis nesta consulta.
        </Text>
      ) : (
        <View onLayout={onLayout}>
          {width > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={onScrollEnd}
            >
              {pages.map((p) => (
                <View key={p.key} style={{ width }}>
                  {p.codes === null ? (
                    <View style={styles.summary}>
                      {g !== null ? (
                        <>
                          <GroupBar
                            label="TÉCNICO"
                            value={Math.round(g.technical)}
                          />
                          <GroupBar
                            label="FÍSICO"
                            value={Math.round(g.physical)}
                          />
                          <GroupBar
                            label="MENTAL"
                            value={Math.round(g.mental)}
                          />
                          {g.goalkeeping !== null ? (
                            <GroupBar
                              label="GOLEIRO"
                              value={Math.round(g.goalkeeping)}
                            />
                          ) : null}
                        </>
                      ) : null}
                      {data.fitness != null || data.morale != null ? (
                        <View style={styles.condRow}>
                          {data.fitness != null ? (
                            <View style={styles.cond}>
                              <Text style={styles.condLabel}>FÍSICO (FIT)</Text>
                              <Text
                                style={[
                                  styles.condValue,
                                  { color: tintFor(data.fitness) },
                                ]}
                              >
                                {data.fitness}%
                              </Text>
                              <ProgressBar
                                value={data.fitness / 100}
                                tint={tintFor(data.fitness)}
                                height={5}
                              />
                            </View>
                          ) : null}
                          {data.morale != null ? (
                            <View style={styles.cond}>
                              <Text style={styles.condLabel}>MORAL</Text>
                              <Text
                                style={[
                                  styles.condValue,
                                  { color: tintFor(data.morale) },
                                ]}
                              >
                                {data.morale}%
                              </Text>
                              <ProgressBar
                                value={data.morale / 100}
                                tint={tintFor(data.morale)}
                                height={5}
                              />
                            </View>
                          ) : null}
                        </View>
                      ) : null}
                    </View>
                  ) : (
                    <View style={styles.grid}>
                      {p.codes.map((code) => (
                        <AttrItem
                          key={code}
                          code={code}
                          value={attrs?.[code] ?? null}
                        />
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          ) : null}
        </View>
      )}

      {pages.length > 1 ? (
        <View style={styles.dots}>
          {pages.map((p, i) => (
            <View
              key={p.key}
              style={[styles.dot, i === page ? styles.dotActive : null]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.backgroundElevated,
    borderColor: color.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.md,
  },
  hero: {
    flexDirection: "row",
    gap: space.lg,
    alignItems: "center",
    paddingTop: space.xs,
  },
  avatarWrap: { width: 76, alignItems: "center", justifyContent: "center" },
  avatar: { borderWidth: 1, borderColor: color.border },
  heroInfo: { flex: 1, gap: 4 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  name: {
    flex: 1,
    color: color.text,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
  },
  heroMeta: { color: color.textMuted, fontSize: fontSize.xs },
  potRow: { flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 2 },
  potLabel: {
    color: color.textFaint,
    fontSize: 9,
    fontWeight: fontWeight.black as "800",
    letterSpacing: 0.5,
  },
  potValue: {
    color: color.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
  },
  potDelta: {
    color: color.success,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.black as "800",
  },
  tabs: { flexDirection: "row", gap: space.xs, flexWrap: "wrap" },
  tab: {
    paddingHorizontal: space.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "transparent",
  },
  tabActive: { borderColor: color.primary, backgroundColor: "#151c0e" },
  tabText: {
    color: color.textFaint,
    fontSize: 9,
    fontWeight: fontWeight.black as "800",
    letterSpacing: 0.5,
  },
  tabTextActive: { color: color.primary },
  divider: { height: 1, backgroundColor: color.border },
  missing: {
    color: color.textMuted,
    fontSize: fontSize.xs,
    fontStyle: "italic",
    paddingVertical: space.sm,
  },
  summary: { gap: space.sm, paddingRight: space.xs },
  groupRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  groupLabel: {
    width: 64,
    color: color.textMuted,
    fontSize: 10,
    fontWeight: fontWeight.black as "800",
    letterSpacing: 0.5,
  },
  groupValue: {
    width: 28,
    textAlign: "right",
    fontSize: fontSize.sm,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
  },
  groupBar: { flex: 1 },
  condRow: { flexDirection: "row", gap: space.lg, marginTop: space.xs },
  cond: { flex: 1, gap: 3 },
  condLabel: {
    color: color.textFaint,
    fontSize: 9,
    fontWeight: fontWeight.black as "800",
    letterSpacing: 0.5,
  },
  condValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: space.sm,
    paddingRight: space.xs,
  },
  attrItem: { width: "47%", gap: 3 },
  attrHead: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: space.xs,
  },
  attrLabel: { flex: 1, color: color.textMuted, fontSize: 11 },
  attrValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 5,
    marginTop: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: color.borderStrong,
  },
  dotActive: { backgroundColor: color.primary, width: 16 },
});
