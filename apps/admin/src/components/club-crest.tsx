/**
 * O escudo do clube.
 *
 * Os quatro modelos são os do catálogo canônico
 * (`packages/core/src/clubs/visual-identity-catalog.ts`): `crest-shield`,
 * `crest-round`, `crest-banner`, `crest-classic`. A API manda o `templateId` e
 * as cores; **o desenho é do cliente** — "os clientes renderizam o SVG
 * correspondente pelo mesmo id". Não inventei modelo: um id fora do catálogo
 * não teria como ser validado pelo domínio.
 *
 * **Clube gerado NÃO tem escudo.** Ele nasce sem identidade visual, e o jogador
 * a define ao personalizar (BC-003). Aqui isso não vira um escudo bonito
 * inventado — vira um marcador neutro com o código do clube: legível, óbvio, e
 * que não afirma uma identidade que o clube não escolheu. Quando o dono
 * personalizar, o escudo aparece sozinho, e a diferença entre os dois estados é
 * a prova de que o dado é real.
 */
export interface CrestIdentity {
  readonly shortCode: string;
  readonly primaryColor: string | null;
  readonly secondaryColor: string | null;
  readonly crestTemplateId: string | null;
}

const SIZE = { sm: 16, md: 22, lg: 32 } as const;

export function ClubCrest({
  club,
  size = "sm",
}: {
  club: CrestIdentity;
  size?: keyof typeof SIZE;
}) {
  const px = SIZE[size];
  const temIdentidade =
    club.crestTemplateId !== null && club.primaryColor !== null;

  if (!temIdentidade) {
    return <CrestPlaceholder shortCode={club.shortCode} px={px} />;
  }

  const primary = club.primaryColor!;
  const secondary = club.secondaryColor ?? "#ffffff";
  const label = `Escudo do ${club.shortCode}`;

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 32 32"
      role="img"
      aria-label={label}
      className="shrink-0"
    >
      {shapeFor(club.crestTemplateId!, primary, secondary)}
    </svg>
  );
}

function shapeFor(templateId: string, primary: string, secondary: string) {
  switch (templateId) {
    case "crest-round":
      return (
        <>
          <circle cx="16" cy="16" r="14" fill={primary} />
          <circle
            cx="16"
            cy="16"
            r="9"
            fill="none"
            stroke={secondary}
            strokeWidth="2.5"
          />
        </>
      );
    case "crest-banner":
      return (
        <>
          <path d="M4 3h24v20l-12 7-12-7z" fill={primary} />
          <path d="M4 11h24v6H4z" fill={secondary} />
        </>
      );
    case "crest-classic":
      return (
        <>
          <path d="M16 1l13 5v11c0 8-6 12-13 14-7-2-13-6-13-14V6z" fill={primary} />
          <path d="M16 6l8 3v8c0 5-4 7-8 8-4-1-8-3-8-8V9z" fill={secondary} />
          <path d="M16 11l4 1.5v4c0 2.5-2 3.5-4 4-2-.5-4-1.5-4-4v-4z" fill={primary} />
        </>
      );
    // `crest-shield` — o clássico, e o default seguro: um templateId
    // desconhecido cai aqui em vez de sumir, porque escudo ausente numa lista de
    // clubes parece dado faltando, não modelo novo.
    default:
      return (
        <>
          <path d="M16 1l13 5v11c0 8-6 12-13 14-7-2-13-6-13-14V6z" fill={primary} />
          <path d="M16 1l13 5v11c0 8-6 12-13 14z" fill={secondary} />
        </>
      );
  }
}

/**
 * Sem identidade visual: um marcador, não um escudo.
 *
 * Tracejado e sem cor de propósito — ele diz "este clube ainda não escolheu",
 * que é a verdade (BC-003), em vez de fingir uma identidade.
 */
function CrestPlaceholder({
  shortCode,
  px,
}: {
  shortCode: string;
  px: number;
}) {
  return (
    <span
      aria-label={`${shortCode} — sem escudo definido`}
      title="Sem identidade visual: o clube ainda não foi personalizado (BC-003)"
      className="inline-flex shrink-0 items-center justify-center rounded-[3px] border border-dashed border-border text-muted-foreground"
      style={{
        width: px,
        height: px,
        fontSize: Math.max(7, Math.round(px * 0.34)),
        lineHeight: 1,
      }}
    >
      {shortCode.slice(0, 3)}
    </span>
  );
}

/** Escudo + nome, que é como o clube aparece em quase toda tela. */
export function ClubName({
  club,
  size = "sm",
}: {
  club: CrestIdentity & { name: string };
  size?: keyof typeof SIZE;
}) {
  return (
    <span className="flex items-center gap-2">
      <ClubCrest club={club} size={size} />
      <span className="truncate">{club.name}</span>
    </span>
  );
}
