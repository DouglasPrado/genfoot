"use client";

import { Globe2, LogOut, ShieldAlert, Terminal } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/session";

const NAV = [
  { href: "/worlds", label: "Mundos", icon: Globe2 },
  { href: "/console", label: "Console", icon: Terminal },
  { href: "/anti-abuse", label: "Anti-abuso", icon: ShieldAlert },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { session, hydrated, logout } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (hydrated && session === null) router.replace("/login");
  }, [hydrated, session, router]);

  // Até hidratar, render consistente com o servidor (null) — sem mismatch.
  if (!hydrated || session === null) return null;

  return (
    <div className="grid min-h-screen grid-cols-[220px_1fr]">
      <aside className="flex flex-col border-r border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-4 py-4">
          <span className="live-dot h-2 w-2 rounded-full bg-primary" />
          <span className="font-heading text-lg leading-none">
            Grinta<span className="text-primary">.</span>Control
          </span>
        </div>
        <nav className="flex-1 p-2" aria-label="Navegação principal">
          {NAV.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`mb-1 flex items-center gap-3 rounded-sm px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                }`}
              >
                <item.icon className="size-4" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="mono truncate text-xs text-muted-foreground">
              {session.subject}
            </span>
            <Badge tone={session.role === "admin" ? "live" : "neutral"}>
              {session.role}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={logout}
          >
            <LogOut className="size-4" /> Sair
          </Button>
        </div>
      </aside>
      <main className="overflow-auto">{children}</main>
    </div>
  );
}

export function PageHeader({
  title,
  hint,
  actions,
}: {
  title: string;
  hint?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex items-center justify-between border-b border-border px-6 py-4">
      <div>
        <h1 className="font-heading text-2xl leading-none">{title}</h1>
        {hint ? (
          <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
        ) : null}
      </div>
      {actions}
    </header>
  );
}
