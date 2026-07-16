import { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/icon";
import {
  color,
  fontSize,
  fontWeight,
  radius,
  space,
} from "@/theme";
import { ClubCrest } from "./crest";
import { KitJersey } from "./kit";
import {
  CREST_TEMPLATES,
  KIT_TEMPLATES,
  SWATCHES,
  defaultVisualIdentity,
  requiresTertiary,
  validateVisualIdentity,
  type VisualIdentity,
} from "./visual-identity";

export function normalizeClubName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/gu, " ");
}

interface CustomizeClubModalProps {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly clubId: string;
  readonly clubName: string;
  readonly clubShortCode: string;
  readonly initial: VisualIdentity | null;
  readonly takenNames: readonly string[];
  readonly submitting: boolean;
  readonly errorCode: string | null;
  readonly onConfirm: (input: {
    readonly name: string;
    readonly shortCode: string;
    readonly visualIdentity: VisualIdentity;
  }) => void;
}

export function CustomizeClubModal(
  props: CustomizeClubModalProps,
): React.JSX.Element {
  // Modal do RN renderiza fora da árvore medida pelo SafeAreaProvider no iOS —
  // aplicar os insets manualmente para não cortar sob o notch/status bar.
  const insets = useSafeAreaInsets();
  const base = props.initial ?? defaultVisualIdentity(props.clubId);
  const [name, setName] = useState(props.clubName);
  const [shortCode, setShortCode] = useState(props.clubShortCode);
  const [identity, setIdentity] = useState<VisualIdentity>(base);
  const letter = (shortCode.charAt(0) || name.charAt(0) || "?").toUpperCase();

  const nameTaken = useMemo(() => {
    const normalized = normalizeClubName(name);
    return (
      normalized !== normalizeClubName(props.clubName) &&
      props.takenNames.includes(normalized)
    );
  }, [name, props.clubName, props.takenNames]);

  const paletteError = validateVisualIdentity(identity);
  const shortCodeValid = /^[A-Z0-9]{2,5}$/u.test(shortCode);
  const canConfirm =
    name.trim() !== "" &&
    !nameTaken &&
    shortCodeValid &&
    paletteError === null &&
    !props.submitting;

  function patch(next: Partial<VisualIdentity>): void {
    setIdentity((current) => ({ ...current, ...next }));
  }

  function confirm(): void {
    if (!canConfirm) return;
    Alert.alert(
      "Confirmar personalização?",
      "Uma mudança de identidade tão marcante abala os torcedores: a torcida do clube vai cair entre 10% e 15%. Deseja continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          style: "destructive",
          onPress: () =>
            props.onConfirm({
              name: name.trim(),
              shortCode,
              visualIdentity: identity,
            }),
        },
      ],
    );
  }

  const tertiaryNeeded = requiresTertiary(identity);

  return (
    <Modal
      visible={props.visible}
      animationType="slide"
      onRequestClose={props.onClose}
    >
      <View
        style={[
          styles.safe,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        <View style={styles.header}>
          <Pressable
            onPress={props.onClose}
            accessibilityRole="button"
            accessibilityLabel="Fechar"
            hitSlop={12}
          >
            <Icon name="arrow-back" size={22} color={color.text} />
          </Pressable>
          <Text style={styles.headerTitle}>PERSONALIZAR CLUBE</Text>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
        >
          {/* Preview ao vivo */}
          <View style={styles.preview}>
            <View style={styles.previewItem}>
              <ClubCrest
                templateId={identity.crestTemplateId}
                primary={identity.primaryColor}
                secondary={identity.secondaryColor}
                tertiary={identity.tertiaryColor}
                letter={letter}
                size={96}
              />
              <Text style={styles.previewLabel}>ESCUDO</Text>
            </View>
            <View style={styles.previewItem}>
              <KitJersey
                templateId={identity.homeKitTemplateId}
                primary={identity.primaryColor}
                secondary={identity.secondaryColor}
                tertiary={identity.tertiaryColor}
                size={96}
              />
              <Text style={styles.previewLabel}>CAMISA 1</Text>
            </View>
            <View style={styles.previewItem}>
              <KitJersey
                templateId={identity.awayKitTemplateId}
                primary={identity.secondaryColor}
                secondary={identity.primaryColor}
                tertiary={identity.tertiaryColor}
                size={96}
              />
              <Text style={styles.previewLabel}>CAMISA 2</Text>
            </View>
          </View>

          {/* Nome e sigla */}
          <Text style={styles.section}>IDENTIDADE</Text>
          <TextInput
            style={[styles.input, nameTaken && styles.inputError]}
            value={name}
            onChangeText={setName}
            placeholder="Nome do clube"
            placeholderTextColor={color.textMuted}
            maxLength={40}
          />
          {nameTaken ? (
            <Text style={styles.fieldError}>
              Já existe um clube com esse nome no mundo.
            </Text>
          ) : null}
          <TextInput
            style={[styles.input, !shortCodeValid && styles.inputError]}
            value={shortCode}
            onChangeText={(value) => setShortCode(value.toUpperCase())}
            placeholder="Sigla (2–5, A–Z 0–9)"
            placeholderTextColor={color.textMuted}
            autoCapitalize="characters"
            maxLength={5}
          />

          {/* Cores */}
          <Text style={styles.section}>CORES</Text>
          <ColorRow
            label="Primária"
            value={identity.primaryColor}
            onSelect={(primaryColor) => patch({ primaryColor })}
          />
          <ColorRow
            label="Secundária"
            value={identity.secondaryColor}
            onSelect={(secondaryColor) => patch({ secondaryColor })}
          />
          <ColorRow
            label={tertiaryNeeded ? "Terciária" : "Terciária (opcional)"}
            value={identity.tertiaryColor}
            onSelect={(tertiaryColor) => patch({ tertiaryColor })}
          />

          {/* Camisa 1 */}
          <Text style={styles.section}>MODELO — CAMISA 1</Text>
          <KitPicker
            selected={identity.homeKitTemplateId}
            primary={identity.primaryColor}
            secondary={identity.secondaryColor}
            tertiary={identity.tertiaryColor}
            onSelect={(homeKitTemplateId) => patch({ homeKitTemplateId })}
          />

          {/* Camisa 2 */}
          <Text style={styles.section}>MODELO — CAMISA 2</Text>
          <KitPicker
            selected={identity.awayKitTemplateId}
            primary={identity.secondaryColor}
            secondary={identity.primaryColor}
            tertiary={identity.tertiaryColor}
            onSelect={(awayKitTemplateId) => patch({ awayKitTemplateId })}
          />

          {/* Escudo */}
          <Text style={styles.section}>MODELO — ESCUDO</Text>
          <CrestPicker
            selected={identity.crestTemplateId}
            primary={identity.primaryColor}
            secondary={identity.secondaryColor}
            tertiary={identity.tertiaryColor}
            letter={letter}
            onSelect={(crestTemplateId) => patch({ crestTemplateId })}
          />

          {paletteError ? (
            <Text style={styles.fieldError}>{paletteError}</Text>
          ) : null}
          {props.errorCode ? (
            <Text style={styles.fieldError}>Falhou: {props.errorCode}</Text>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={[styles.confirm, !canConfirm && styles.confirmDisabled]}
            onPress={confirm}
            disabled={!canConfirm}
            accessibilityRole="button"
            accessibilityLabel="Confirmar personalização"
          >
            <Text style={styles.confirmText}>
              {props.submitting ? "ENVIANDO…" : "CONFIRMAR"}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function ColorRow(props: {
  readonly label: string;
  readonly value: string | null;
  readonly onSelect: (color: string) => void;
}): React.JSX.Element {
  return (
    <View style={styles.colorRow}>
      <Text style={styles.colorLabel}>{props.label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.swatchRow}>
          {SWATCHES.map((swatch) => {
            const selected =
              props.value?.toUpperCase() === swatch.toUpperCase();
            return (
              <Pressable
                key={swatch}
                onPress={() => props.onSelect(swatch)}
                accessibilityRole="button"
                accessibilityLabel={`${props.label} ${swatch}`}
                style={[
                  styles.swatch,
                  { backgroundColor: swatch },
                  selected && styles.swatchSelected,
                ]}
              />
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

function KitPicker(props: {
  readonly selected: string;
  readonly primary: string;
  readonly secondary: string;
  readonly tertiary: string | null;
  readonly onSelect: (id: string) => void;
}): React.JSX.Element {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.pickerRow}>
        {KIT_TEMPLATES.map((template) => {
          const selected = template.id === props.selected;
          return (
            <Pressable
              key={template.id}
              onPress={() => props.onSelect(template.id)}
              accessibilityRole="button"
              accessibilityLabel={template.name}
              style={[styles.tile, selected && styles.tileSelected]}
            >
              <KitJersey
                templateId={template.id}
                primary={props.primary}
                secondary={props.secondary}
                tertiary={props.tertiary}
                size={56}
              />
              <Text style={styles.tileLabel}>
                {template.name}
                {template.colorSlots === 3 ? " · 3" : ""}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

function CrestPicker(props: {
  readonly selected: string;
  readonly primary: string;
  readonly secondary: string;
  readonly tertiary: string | null;
  readonly letter: string;
  readonly onSelect: (id: string) => void;
}): React.JSX.Element {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.pickerRow}>
        {CREST_TEMPLATES.map((template) => {
          const selected = template.id === props.selected;
          return (
            <Pressable
              key={template.id}
              onPress={() => props.onSelect(template.id)}
              accessibilityRole="button"
              accessibilityLabel={template.name}
              style={[styles.tile, selected && styles.tileSelected]}
            >
              <ClubCrest
                templateId={template.id}
                primary={props.primary}
                secondary={props.secondary}
                tertiary={props.tertiary}
                letter={props.letter}
                size={56}
              />
              <Text style={styles.tileLabel}>
                {template.name}
                {template.colorSlots === 3 ? " · 3" : ""}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
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
    borderBottomWidth: 1,
    borderBottomColor: color.surfaceRaised,
  },
  headerTitle: {
    color: color.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
    letterSpacing: 0.5,
  },
  body: { padding: space.lg, gap: space.md, paddingBottom: space.xl4 },
  preview: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    backgroundColor: color.surfaceRaised,
    borderRadius: radius.md,
    paddingVertical: space.md,
  },
  previewItem: { alignItems: "center", gap: 4 },
  previewLabel: {
    color: color.textMuted,
    fontSize: 9,
    fontWeight: fontWeight.bold as "700",
    letterSpacing: 0.5,
  },
  section: {
    color: color.textMuted,
    fontSize: 10,
    fontWeight: fontWeight.bold as "700",
    letterSpacing: 1,
    marginTop: space.sm,
  },
  input: {
    backgroundColor: color.surfaceRaised,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: color.surfaceRaised,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    color: color.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold as "700",
  },
  inputError: { borderColor: color.danger },
  fieldError: { color: color.danger, fontSize: fontSize.xs },
  colorRow: { gap: 6 },
  colorLabel: {
    color: color.text,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold as "600",
  },
  swatchRow: { flexDirection: "row", gap: space.sm, paddingVertical: 2 },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.15)",
  },
  swatchSelected: { borderColor: color.primary, borderWidth: 3 },
  pickerRow: { flexDirection: "row", gap: space.sm, paddingVertical: 2 },
  tile: {
    alignItems: "center",
    gap: 2,
    padding: space.xs,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: "transparent",
    backgroundColor: color.surfaceRaised,
  },
  tileSelected: { borderColor: color.primary },
  tileLabel: {
    color: color.textMuted,
    fontSize: 9,
    fontWeight: fontWeight.semibold as "600",
  },
  footer: {
    padding: space.lg,
    borderTopWidth: 1,
    borderTopColor: color.surfaceRaised,
  },
  confirm: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
    backgroundColor: color.primary,
  },
  confirmDisabled: { backgroundColor: color.surfaceRaised },
  confirmText: {
    color: color.primaryContrast,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.black as "800",
    letterSpacing: 0.5,
  },
});
