import type { Metadata, Viewport } from "next";
import { Archivo, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppChrome } from "@/components/AppChrome";
import { getSearchIndex } from "@/lib/content";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const archivo = Archivo({
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  style: ["normal", "italic"],
  variable: "--font-archivo",
  display: "swap",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Grinta — Guia Oficial do Jogador",
    template: "%s · Grinta — Guia do Jogador",
  },
  description:
    "O manual oficial do Grinta: o que você pode fazer, como cada sistema funciona e a relação de causa e efeito de cada decisão no seu clube.",
  applicationName: "Grinta — Guia do Jogador",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/brand/grinta-icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/brand/grinta-icon.svg" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0C0D11" },
    { media: "(prefers-color-scheme: light)", color: "#F5F7FA" },
  ],
  width: "device-width",
  initialScale: 1,
};

// Dark-first (identidade de marca Grinta). A escolha salva pelo usuário sempre
// prevalece; o toggle no cabeçalho oferece o tema claro do design system.
const themeInit = `(function(){try{var t=localStorage.getItem('grinta-theme');document.documentElement.setAttribute('data-theme',t==='light'?'light':'dark');}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const searchIndex = getSearchIndex();
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.variable} ${archivo.variable} ${mono.variable}`}>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <AppChrome searchIndex={searchIndex}>{children}</AppChrome>
      </body>
    </html>
  );
}
