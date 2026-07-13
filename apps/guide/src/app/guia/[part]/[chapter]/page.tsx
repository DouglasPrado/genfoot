import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllChapters, getChapter, getNeighbors, getPart } from "@/lib/content";
import { BlockRenderer } from "@/components/BlockRenderer";
import { Icon } from "@/components/Icon";

interface Params {
  part: string;
  chapter: string;
}

export function generateStaticParams(): Params[] {
  return getAllChapters().map((c) => ({ part: c.partSlug, chapter: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { part, chapter: chapterSlug } = await params;
  const chapter = getChapter(part, chapterSlug);
  if (!chapter) return {};
  return {
    title: `${chapter.number}. ${chapter.title}`,
    description: chapter.description,
  };
}

export default async function ChapterPage({ params }: { params: Promise<Params> }) {
  const { part: partSlug, chapter: chapterSlug } = await params;
  const part = getPart(partSlug);
  const chapter = getChapter(partSlug, chapterSlug);
  if (!part || !chapter) notFound();

  const { prev, next } = getNeighbors(chapter);

  return (
    <article className="content-inner" style={{ ["--part-accent" as string]: part.accent }}>
      <header className="chapter-head">
        <div className="chapter-head__crumb">
          <Link href={`/guia/${part.slug}/`} className="chip">
            <img src={`/parts/${part.slug}.jpg`} alt="" className="chip__thumb" />
            Parte {part.roman} · {part.title}
          </Link>
          <span className="chapter-head__num mono">Cap. {chapter.number}</span>
        </div>
        <h1 className="chapter-title">{chapter.title}</h1>
      </header>

      <BlockRenderer blocks={chapter.blocks} />

      <nav className="pager" aria-label="Navegação entre capítulos">
        {prev ? (
          <Link href={prev.route} className="pager__link">
            <span className="pager__dir">
              <Icon name="arrow-left" size={14} /> Anterior
            </span>
            <span className="pager__title">
              {prev.number}. {prev.title}
            </span>
          </Link>
        ) : (
          <span className="pager__link pager__link--empty" />
        )}
        {next ? (
          <Link href={next.route} className="pager__link pager__link--next">
            <span className="pager__dir">
              Próximo <Icon name="arrow-right" size={14} />
            </span>
            <span className="pager__title">
              {next.number}. {next.title}
            </span>
          </Link>
        ) : (
          <span className="pager__link pager__link--empty" />
        )}
      </nav>
    </article>
  );
}
