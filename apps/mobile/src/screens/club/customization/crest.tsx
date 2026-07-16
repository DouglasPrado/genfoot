import Svg, {
  Circle,
  Path,
  Polygon,
  Text as SvgText,
} from "react-native-svg";

interface ClubCrestProps {
  readonly templateId: string;
  readonly primary: string;
  readonly secondary: string;
  readonly tertiary: string | null;
  readonly letter: string;
  readonly size?: number;
}

const SHIELD = "M50,6 L88,20 L88,50 Q88,82 50,96 Q12,82 12,50 L12,20 Z";

/** Cor de texto legível sobre um fundo hex. */
export function readableText(hex: string): string {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (match === null) return "#F8FAFC";
  const value = Number.parseInt(match[1]!, 16);
  const r = (value >> 16) & 0xff;
  const g = (value >> 8) & 0xff;
  const b = value & 0xff;
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance > 140 ? "#0A0B0D" : "#F8FAFC";
}

/** Renderiza o escudo (SVG) para um modelo do catálogo com a inicial do clube. */
export function ClubCrest({
  templateId,
  primary,
  secondary,
  tertiary,
  letter,
  size = 96,
}: ClubCrestProps): React.JSX.Element {
  const third = tertiary ?? secondary;
  const round = templateId === "crest-round" || templateId === "crest-classic";
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {round ? (
        <Circle
          cx={50}
          cy={50}
          r={44}
          fill={primary}
          stroke={secondary}
          strokeWidth={5}
        />
      ) : (
        <Path
          d={SHIELD}
          fill={primary}
          stroke={secondary}
          strokeWidth={3}
          strokeLinejoin="round"
        />
      )}

      {templateId === "crest-banner" ? (
        <Polygon points="18,72 82,72 74,92 26,92" fill={third} />
      ) : null}
      {templateId === "crest-classic" ? (
        <Polygon
          points="50,12 54,22 65,22 56,28 60,39 50,32 40,39 44,28 35,22 46,22"
          fill={third}
        />
      ) : null}

      <Circle cx={50} cy={round ? 50 : 46} r={22} fill={secondary} />
      <SvgText
        x={50}
        y={round ? 50 : 46}
        fontSize={28}
        fontWeight="bold"
        fontStyle="italic"
        fill={readableText(secondary)}
        textAnchor="middle"
        alignmentBaseline="central"
      >
        {letter.toUpperCase()}
      </SvgText>
    </Svg>
  );
}
