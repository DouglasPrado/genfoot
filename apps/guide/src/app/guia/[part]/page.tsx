import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPart, getParts } from "@/lib/content";
import { Markdown } from "@/components/Markdown";

interface Params {
  part: string;
}

export function generateStaticParams(): Params[] {
  return getParts().map((p) => ({ part: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { part: partSlug } = await params;
  const part = getPart(partSlug);
  if (!part) return {};
  return { title: `Parte ${part.roman} — ${part.title}`, description: part.subtitle };
}

export default async function PartPage({ params }: { params: Promise<Params> }) {
  const { part: partSlug } = await params;
  const part = getPart(partSlug);
  if (!part) notFound();

  return (
    <div className="content-inner content-inner--wide" style={{ ["--part-accent" as string]: part.accent }}>
      <div className="part-banner">
        <img src={`/parts/${part.slug}.jpg`} alt="" />
        <span className="part-banner__roman">Parte {part.roman}</span>
      </div>
      <header className="chapter-head">
        <div className="chapter-head__crumb">
          <span className="chip">Parte {part.roman}</span>
          <span className="chapter-head__num mono">
            {part.chapters.length} {part.chapters.length === 1 ? "capítulo" : "capítulos"}
          </span>
        </div>
        <h1 className="chapter-title">{part.title}</h1>
        <p className="chapter-lede">{part.subtitle}</p>
      </header>

      {part.intro && (
        <div className="prose" style={{ marginBottom: "2rem" }}>
          <Markdown layers={false}>{part.intro}</Markdown>
        </div>
      )}

      <div className="index-list">
        {part.chapters.map((c) => (
          <Link key={c.route} href={c.route} className="index-row">
            <span className="index-row__n mono">{c.number}</span>
            <span>
              <span className="index-row__t">{c.title}</span>
              <span className="index-row__d">{c.description}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
