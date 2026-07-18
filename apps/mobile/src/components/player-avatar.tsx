import {
  Image,
  StyleSheet,
  Text,
  View,
  type ImageStyle,
  type StyleProp,
} from "react-native";
import { ClubCrest } from "@/screens/club/customization/crest";
import type { ClubCrestData } from "@/screens/club/customization/visual-identity";
import { color, radius, fontWeight } from "@/theme";

/**
 * Placeholder oficial do jogador sem foto — silhueta anônima no estilo do app.
 * O domínio ainda não tem foto de jogador, então hoje é sempre este; quando
 * houver, passe `photoUrl` e ele entra no lugar.
 */
const PLACEHOLDER = require("../../assets/player-avatar.png") as number;

/**
 * Avatar do jogador (foto ou silhueta), com o escudo do clube sobreposto no
 * canto inferior-direito quando `crest` é passado — o mesmo padrão no card de
 * perfil e na lista do mercado.
 */
export function PlayerAvatar({
  photoUrl,
  size = 40,
  radius: br,
  crest,
  crestSize,
  ovr,
  style,
}: {
  photoUrl?: string | null;
  size?: number;
  radius?: number;
  crest?: ClubCrestData | null;
  crestSize?: number;
  /** Overall — quando presente, vira o medalhão em destaque no topo da foto. */
  ovr?: number | null;
  style?: StyleProp<ImageStyle>;
}) {
  const avatar = (
    <Image
      source={photoUrl != null && photoUrl !== "" ? { uri: photoUrl } : PLACEHOLDER}
      style={[
        {
          width: size,
          height: size,
          borderRadius: br ?? size / 2,
          backgroundColor: color.surfaceRaised,
        },
        style,
      ]}
      resizeMode="cover"
      accessibilityIgnoresInvertColors
    />
  );

  if (crest == null && ovr == null) return avatar;

  return (
    <View style={{ width: size, height: size }}>
      {avatar}
      {crest != null ? (
        <View style={styles.crest}>
          <ClubCrest
            templateId={crest.templateId}
            primary={crest.primary}
            secondary={crest.secondary}
            tertiary={crest.tertiary}
            letter={crest.letter}
            size={crestSize ?? Math.round(size * 0.44)}
          />
        </View>
      ) : null}
      {ovr != null ? (
        <View
          style={[styles.ovrWrap, { top: -Math.round(size * 0.12) }]}
          pointerEvents="none"
        >
          <View style={[styles.ovrPill, { minWidth: Math.round(size * 0.5) }]}>
            <Text
              style={[styles.ovrText, { fontSize: Math.max(10, Math.round(size * 0.24)) }]}
            >
              {ovr}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  crest: {
    position: "absolute",
    right: -5,
    bottom: -5,
    borderRadius: radius.pill,
    backgroundColor: color.backgroundElevated,
    padding: 1,
  },
  ovrWrap: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  ovrPill: {
    alignItems: "center",
    paddingHorizontal: 5,
    paddingVertical: 0,
    borderRadius: radius.pill,
    backgroundColor: color.primary,
    borderWidth: 2,
    borderColor: color.backgroundElevated,
  },
  ovrText: {
    color: color.primaryContrast,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
  },
});

