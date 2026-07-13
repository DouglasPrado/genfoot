import { Sidebar, type NavPart } from "@/components/Sidebar";
import { Toc } from "@/components/Toc";
import { getParts } from "@/lib/content";

export default function GuiaLayout({ children }: { children: React.ReactNode }) {
  const nav: NavPart[] = getParts().map((p) => ({
    slug: p.slug,
    roman: p.roman,
    title: p.title,
    icon: p.icon,
    accent: p.accent,
    route: `/guia/${p.slug}/`,
    chapters: p.chapters.map((c) => ({ number: c.number, title: c.title, route: c.route })),
  }));

  return (
    <div className="guide-shell">
      <Sidebar nav={nav} />
      <main className="content-col">{children}</main>
      <Toc />
    </div>
  );
}
