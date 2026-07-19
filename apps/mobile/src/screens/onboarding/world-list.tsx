import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { color, fontSize, fontWeight, radius, space } from "@/theme";
import {
  deriveWorldCards,
  entryLabel,
  type WorldCard,
  type WorldListSource,
} from "./world-pick-model";

/**
 * M-WORLD-PICK — a lista de mundos (R-208).
 *
 * Substitui o passo "ENTRAR NO MUNDO", que era um botão sobre o mundo fixado no
 * build: o jogador nunca via que existiam outros. Aqui ele vê os mundos que
 * existem, com o que o doc da tela pede para decidir — temporada, nº de clubes
 * e vagas.
 *
 * A decisão de rótulo/ordem mora em `world-pick-model` (puro, testado); este
 * componente só renderiza e despacha (§6).
 */
interface WorldListProps {
  readonly worlds: readonly WorldListSource[];
  readonly state: "loading" | "ready" | "empty" | "error" | "offline";
  readonly authenticated: boolean;
  readonly onSelect: (worldId: string) => void;
  readonly onRetry: () => void;
}

export function WorldList({
  worlds,
  state,
  authenticated,
  onSelect,
  onRetry,
}: WorldListProps): React.JSX.Element {
  if (state === "loading") {
    return <Aviso texto="Carregando os mundos disponíveis…" />;
  }
  if (state === "error" || state === "offline") {
    return (
      <Aviso
        texto={
          state === "offline"
            ? "Sem conexão com o servidor."
            : "Não foi possível carregar os mundos."
        }
        acao={{ rotulo: "Tentar de novo", aoTocar: onRetry }}
      />
    );
  }

  const cards = deriveWorldCards(worlds, { authenticated });
  if (cards.length === 0) {
    // Estado vazio do doc. Sem mundo demo de consolo: a lista diz a verdade.
    return <Aviso texto="Nenhum mundo disponível no momento." />;
  }

  return (
    <ScrollView
      style={styles.lista}
      contentContainerStyle={styles.listaConteudo}
    >
      {cards.map((card) => (
        <CardMundo key={card.id} card={card} onSelect={onSelect} />
      ))}
    </ScrollView>
  );
}

function CardMundo({
  card,
  onSelect,
}: {
  readonly card: WorldCard;
  readonly onSelect: (worldId: string) => void;
}): React.JSX.Element {
  const rotulo = entryLabel(card.entry);
  return (
    <Pressable
      style={[styles.card, !card.selectable && styles.cardBloqueado]}
      disabled={!card.selectable}
      onPress={() => onSelect(card.id)}
      accessibilityRole="button"
      accessibilityState={{ disabled: !card.selectable }}
      accessibilityLabel={
        rotulo === null
          ? `${card.title}, ${card.openSlots} vagas`
          : `${card.title}, ${rotulo}, ${card.openSlots} vagas`
      }
    >
      <View style={styles.cardTopo}>
        <Text style={styles.cardTitulo}>{card.title}</Text>
        {rotulo !== null && (
          <Text
            style={[
              styles.selo,
              card.entry.kind === "resume" && styles.seloDestaque,
            ]}
          >
            {rotulo}
          </Text>
        )}
      </View>
      <Text style={styles.cardMeta}>
        {card.clubCount} clubes · {card.openSlots}{" "}
        {card.openSlots === 1 ? "vaga" : "vagas"}
      </Text>
      <Text style={styles.cardData}>Temporada em {card.season}</Text>
    </Pressable>
  );
}

function Aviso({
  texto,
  acao,
}: {
  readonly texto: string;
  readonly acao?: { readonly rotulo: string; readonly aoTocar: () => void };
}): React.JSX.Element {
  return (
    <View style={styles.aviso}>
      <Text style={styles.avisoTexto}>{texto}</Text>
      {acao !== undefined && (
        <Pressable
          style={styles.avisoBotao}
          onPress={acao.aoTocar}
          accessibilityRole="button"
        >
          <Text style={styles.avisoBotaoTexto}>{acao.rotulo}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  lista: { flex: 1 },
  listaConteudo: { gap: space.sm, paddingBottom: space.lg },
  card: {
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.xs,
    backgroundColor: color.surface,
  },
  cardBloqueado: { opacity: 0.45 },
  cardTopo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.sm,
  },
  cardTitulo: {
    color: color.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    flexShrink: 1,
  },
  selo: {
    color: color.textMuted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  seloDestaque: { color: color.primary },
  cardMeta: { color: color.textMuted, fontSize: fontSize.sm },
  cardData: { color: color.textMuted, fontSize: fontSize.xs },
  aviso: { gap: space.md, paddingVertical: space.lg },
  avisoTexto: { color: color.textMuted, fontSize: fontSize.sm },
  avisoBotao: {
    borderWidth: 1,
    borderColor: color.primary,
    borderRadius: radius.sm,
    paddingVertical: space.sm,
    alignItems: "center",
  },
  avisoBotaoTexto: {
    color: color.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
});
