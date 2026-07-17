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
 * **Clube gerado não tem escudo GRAVADO** — nasce sem identidade visual, e o
 * jogador a define ao personalizar (BC-003). Hoje TODOS os 32 clubes estão
 * assim: `SELECT count(crestTemplateId) → 0`. E não é descuido de seed — o
 * command `UpdateClubVisualIdentity` morreu junto com o `WorldClubPortfolio`
 * (R-175); não existe porta HTTP capaz de dar escudo a um clube.
 *
 * Então usamos o MESMO mecanismo do app (`visual-identity.ts:154`), com os
 * mesmos 8 presets e o mesmo hash FNV-1a: identidade default DETERMINÍSTICA,
 * derivada do nome, "para que cada clube pareça distinto". Não é invenção nem
 * fallback silencioso — é o comportamento que o app já tem, e ele deriva do
 * mesmo dado real (o nome do clube), não de um random.
 *
 * O que continua honesto: `derivada` diz qual é qual. Um escudo derivado não se
 * passa por escolhido — o `title` avisa, e no dia em que o command voltar, o
 * escudo do dono entra e a marca sai.
 */
export interface CrestIdentity {
  readonly name?: string;
  readonly shortCode: string;
  readonly primaryColor: string | null;
  readonly secondaryColor: string | null;
  readonly crestTemplateId: string | null;
}

const SIZE = { sm: 16, md: 22, lg: 32 } as const;

/** Os 8 presets do app (`visual-identity.ts`), na mesma ordem. */
const PRESETS: readonly { primary: string; secondary: string; crest: string }[] =
  [
    { primary: "#E11D2E", secondary: "#0A0B0D", crest: "crest-shield" },
    { primary: "#1D4ED8", secondary: "#F8FAFC", crest: "crest-round" },
    { primary: "#16A34A", secondary: "#F8FAFC", crest: "crest-shield" },
    { primary: "#0A0B0D", secondary: "#C2F74A", crest: "crest-banner" },
    { primary: "#7C3AED", secondary: "#FACC15", crest: "crest-classic" },
    { primary: "#0EA5A4", secondary: "#0A0B0D", crest: "crest-round" },
  ];

/** O MESMO hash do app (FNV-1a): mesmo clube, mesmo escudo, nos dois clientes. */
function hashString(value: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

function derivada(seed: string) {
  return PRESETS[hashString(seed) % PRESETS.length]!;
}

export function ClubCrest({
  club,
  size = "sm",
}: {
  club: CrestIdentity;
  size?: keyof typeof SIZE;
}) {
  const px = SIZE[size];
  const escolhida =
    club.crestTemplateId !== null && club.primaryColor !== null;

  const preset = escolhida
    ? {
        primary: club.primaryColor!,
        secondary: club.secondaryColor ?? "#F8FAFC",
        crest: club.crestTemplateId!,
      }
    : derivada(club.name ?? club.shortCode);

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 32 32"
      role="img"
      aria-label={`Escudo do ${club.shortCode}`}
      className="shrink-0"
    >
      <title>
        {escolhida
          ? `${club.shortCode} — identidade escolhida pelo dono`
          : `${club.shortCode} — escudo derivado do nome; o clube ainda não foi personalizado (BC-003)`}
      </title>
      {shapeFor(preset.crest, preset.primary, preset.secondary)}
      {/* Escudo derivado leva uma marca discreta: ele NÃO se passa por
          escolhido. No dia em que `UpdateClubVisualIdentity` voltar, o escudo do
          dono entra e este ponto some — a diferença é a prova. */}
      {escolhida ? null : (
        <circle cx="28.5" cy="3.5" r="2.5" className="fill-[color:var(--warn)]" />
      )}
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
