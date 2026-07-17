/**
 * A posição do jogador, colorida como no app.
 *
 * As duas metades vêm do mobile, não de mim:
 *
 * - **Os rótulos** são os de `apps/mobile/src/lib/club-projection.ts:132`
 *   (`positionPresentation`): GK→GOL, CB→ZAG, CDM→VOL, LW→PTE, RW→PTD… A sigla
 *   canônica (`genesis-types.ts:10`) é o que o domínio valida; o rótulo é como o
 *   jogador brasileiro lê. Mostrar "CDM" numa tela em português seria mostrar o
 *   enum, não a posição.
 * - **As cores** são as de `apps/mobile/src/screens/squad/pitch.tsx:15`
 *   (`GROUP_TINT`), pelos tokens do design system: GOL `energy`, DEF `info`,
 *   MEI `primary`, ATA `home`.
 *
 * Copiar os valores em vez de importar é dívida consciente: o `pitch.tsx` é
 * React Native (`StyleSheet`) e não atravessa para o web. O lugar certo destes
 * quatro pares é o `@grinta/design-system`, que os dois clientes já consomem —
 * anotado, não escondido.
 */

const GRUPO = {
  GOL: "GOL",
  DEF: "DEF",
  MEI: "MEI",
  ATA: "ATA",
} as const;

type Grupo = (typeof GRUPO)[keyof typeof GRUPO];

/** Sigla canônica → rótulo em pt-BR + grupo. Espelha `positionPresentation`. */
const POSICAO: Readonly<Record<string, { label: string; grupo: Grupo }>> = {
  GK: { label: "GOL", grupo: GRUPO.GOL },
  CB: { label: "ZAG", grupo: GRUPO.DEF },
  LB: { label: "LE", grupo: GRUPO.DEF },
  RB: { label: "LD", grupo: GRUPO.DEF },
  CDM: { label: "VOL", grupo: GRUPO.MEI },
  CM: { label: "MC", grupo: GRUPO.MEI },
  CAM: { label: "MEI", grupo: GRUPO.MEI },
  LW: { label: "PTE", grupo: GRUPO.ATA },
  RW: { label: "PTD", grupo: GRUPO.ATA },
  ST: { label: "ATA", grupo: GRUPO.ATA },
  CF: { label: "ATA", grupo: GRUPO.ATA },
};

/** `GROUP_TINT` do pitch, em hex — os mesmos tokens do design system. */
const COR: Record<Grupo, string> = {
  GOL: "#f5c518", // color.energy
  DEF: "#5c7ce0", // color.info
  MEI: "#c2f74a", // color.primary
  ATA: "#e05c5c", // color.home
};

export function PositionBadge({ posicao }: { posicao: string }) {
  // Sigla desconhecida mostra a própria sigla, em cinza: some do colorido sem
  // sumir da tela. Um badge vazio pareceria jogador sem posição.
  const info = POSICAO[posicao];
  const cor = info === undefined ? "#8b8f97" : COR[info.grupo];
  return (
    <span
      title={posicao}
      className="mono w-9 shrink-0 rounded-[3px] border px-1 py-0.5 text-center text-[10px] font-semibold"
      style={{
        color: cor,
        borderColor: `${cor}66`,
        backgroundColor: `${cor}1a`,
      }}
    >
      {info?.label ?? posicao}
    </span>
  );
}
