import type { CSSProperties } from "react";

// Set de ícones consistente (grade 24, traço ~1.75), alinhado ao par cor+ícone+texto
// exigido pelo design system (§3.7 / §7). Traço em currentColor.

export type IconName =
  | "flag" | "globe" | "shield" | "user" | "swap" | "pitch" | "trophy"
  | "megaphone" | "compass" | "book"
  | "rule" | "warning" | "example" | "hidden" | "reference"
  | "search" | "menu" | "close" | "chevron-right" | "chevron-down"
  | "arrow-left" | "arrow-right" | "sun" | "moon" | "home" | "clock"
  | "list" | "book-open" | "spark" | "check" | "compass2" | "layers";

export function Icon({
  name,
  size = 24,
  className,
  style,
  strokeWidth = 1.75,
}: {
  name: IconName;
  size?: number;
  className?: string;
  style?: CSSProperties;
  strokeWidth?: number;
}) {
  return (
    <svg
      className={className}
      style={style}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {glyph(name)}
    </svg>
  );
}

function glyph(name: IconName) {
  switch (name) {
    case "flag":
      return (<><path d="M5 21V4" /><path d="M5 4h9l-2 3 2 3H5" /></>);
    case "globe":
      return (<><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3c-3 3-3 15 0 18M12 3c3 3 3 15 0 18" /></>);
    case "shield":
      return (<><path d="M12 3 5 6v5c0 4 3 7 7 9 4-2 7-5 7-9V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></>);
    case "user":
      return (<><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>);
    case "swap":
      return (<><path d="M4 8h13l-3-3M20 16H7l3 3" /></>);
    case "pitch":
      return (<><rect x="3" y="4" width="18" height="16" rx="1.5" /><path d="M12 4v16" /><circle cx="12" cy="12" r="2.5" /><path d="M3 9h3v6H3M21 9h-3v6h3" /></>);
    case "trophy":
      return (<><path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" /><path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3" /><path d="M10 14v3M14 14v3M8 20h8M9 20a3 3 0 0 1 6 0" /></>);
    case "megaphone":
      return (<><path d="M4 10v4a1 1 0 0 0 1 1h2l7 4V5L7 9H5a1 1 0 0 0-1 1Z" /><path d="M14 8a4 4 0 0 1 0 8" /></>);
    case "compass":
    case "compass2":
      return (<><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" /></>);
    case "book":
      return (<><path d="M5 4h11a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H5V4Z" /><path d="M5 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2" /></>);
    case "book-open":
      return (<><path d="M12 6C10 4.5 6.5 4.5 4 5v13c2.5-.5 6-.5 8 1 2-1.5 5.5-1.5 8-1V5c-2.5-.5-6-.5-8 1Z" /><path d="M12 6v14" /></>);
    case "rule":
      return (<><path d="M4 6h10M4 12h10M4 18h7" /><path d="m16 16 2 2 4-4" /></>);
    case "warning":
      return (<><path d="M12 3 2.5 20h19L12 3Z" /><path d="M12 10v4M12 17.5v.5" /></>);
    case "example":
      return (<><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.4 1 2.5h6c0-1.1.3-1.8 1-2.5A6 6 0 0 0 12 3Z" /></>);
    case "hidden":
      return (<><path d="M2 12s3.5-7 10-7 10 7 10 7a18 18 0 0 1-3 3.5M9.5 9.5a3 3 0 0 0 4 4" /><path d="M6 6l12 12" /><path d="M14.5 14.5A10 10 0 0 1 12 15c-6.5 0-10-7-10-7" opacity="0" /></>);
    case "reference":
      return (<><path d="M6 3h12v18l-6-4-6 4V3Z" /></>);
    case "search":
      return (<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>);
    case "menu":
      return (<><path d="M4 7h16M4 12h16M4 17h16" /></>);
    case "close":
      return (<><path d="m6 6 12 12M18 6 6 18" /></>);
    case "chevron-right":
      return (<path d="m9 6 6 6-6 6" />);
    case "chevron-down":
      return (<path d="m6 9 6 6 6-6" />);
    case "arrow-left":
      return (<><path d="M20 12H4M10 6l-6 6 6 6" /></>);
    case "arrow-right":
      return (<><path d="M4 12h16M14 6l6 6-6 6" /></>);
    case "sun":
      return (<><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>);
    case "moon":
      return (<path d="M20 14A8 8 0 1 1 10 4a6 6 0 0 0 10 10Z" />);
    case "home":
      return (<><path d="m3 11 9-7 9 7" /><path d="M5 10v10h14V10" /></>);
    case "clock":
      return (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>);
    case "list":
      return (<><path d="M8 6h12M8 12h12M8 18h12M4 6v.01M4 12v.01M4 18v.01" /></>);
    case "spark":
      return (<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />);
    case "check":
      return (<path d="m5 12 5 5 9-11" />);
    case "layers":
      return (<><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" /></>);
    default:
      return null;
  }
}
