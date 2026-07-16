import { useId } from "react";
import Svg, {
  ClipPath,
  Defs,
  G,
  Path,
  Polygon,
  Rect,
} from "react-native-svg";

interface KitJerseyProps {
  readonly templateId: string;
  readonly primary: string;
  readonly secondary: string;
  readonly tertiary: string | null;
  readonly size?: number;
}

const JERSEY =
  "M50,12 L63,15 L86,27 L79,46 L67,40 L67,90 L33,90 L33,40 L21,46 L14,27 L37,15 Z";
const COLLAR = "M43,14 L50,24 L57,14 L50,18 Z";

/** Renderiza uma camisa (SVG) para um modelo do catálogo, colorida pela paleta. */
export function KitJersey({
  templateId,
  primary,
  secondary,
  tertiary,
  size = 96,
}: KitJerseyProps): React.JSX.Element {
  const clipId = `jersey-${useId().replace(/[^a-zA-Z0-9]/gu, "")}`;
  const third = tertiary ?? secondary;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <ClipPath id={clipId}>
          <Path d={JERSEY} />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${clipId})`}>
        <Rect x={0} y={0} width={100} height={100} fill={primary} />
        {templateId === "kit-stripes"
          ? [20, 32, 44, 56, 68, 80].map((x) => (
              <Rect
                key={x}
                x={x}
                y={0}
                width={6}
                height={100}
                fill={secondary}
              />
            ))
          : null}
        {templateId === "kit-hoops"
          ? [16, 32, 48, 64, 80].map((y) => (
              <Rect
                key={y}
                x={0}
                y={y}
                width={100}
                height={8}
                fill={secondary}
              />
            ))
          : null}
        {templateId === "kit-sash" ? (
          <Polygon points="8,58 46,12 64,12 8,80" fill={secondary} />
        ) : null}
        {templateId === "kit-halves" ? (
          <Rect x={50} y={0} width={50} height={100} fill={secondary} />
        ) : null}
        {templateId === "kit-tricolor" ? (
          <>
            <Rect x={33.3} y={0} width={33.3} height={100} fill={secondary} />
            <Rect x={66.6} y={0} width={33.4} height={100} fill={third} />
          </>
        ) : null}
        {templateId === "kit-quarters" ? (
          <>
            <Rect x={50} y={0} width={50} height={50} fill={secondary} />
            <Rect x={0} y={50} width={50} height={50} fill={third} />
          </>
        ) : null}
      </G>
      {/* Gola + contorno por cima do padrão. */}
      <Path d={COLLAR} fill={secondary} />
      <Path
        d={JERSEY}
        fill="none"
        stroke="rgba(0,0,0,0.35)"
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </Svg>
  );
}
