import { Image, StyleSheet, View, type ImageStyle, type StyleProp } from "react-native";
import { ClubCrest } from "@/screens/club/customization/crest";
import type { ClubCrestData } from "@/screens/club/customization/visual-identity";
import { color, radius } from "@/theme";

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
  style,
}: {
  photoUrl?: string | null;
  size?: number;
  radius?: number;
  crest?: ClubCrestData | null;
  crestSize?: number;
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

  if (crest == null) return avatar;

  return (
    <View style={{ width: size, height: size }}>
      {avatar}
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
});
