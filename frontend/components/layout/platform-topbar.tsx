"use client";

import { Bell, ChevronRight, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeModeToggle } from "@/components/theme-mode-toggle";
import { navItems } from "./nav-items";

function buildBreadcrumb(pathname: string) {
  if (pathname === "/") return [{ label: "运营态势", href: "/" }];
  const exact = navItems.find((i) => i.href === pathname);
  if (exact) return [{ label: "平台", href: "/" }, { label: exact.label, href: exact.href }];
  const segs = pathname.split("/").filter(Boolean);
  return [
    { label: "平台", href: "/" },
    ...segs.map((seg, idx) => ({
      label: decodeURIComponent(seg),
      href: "/" + segs.slice(0, idx + 1).join("/"),
    })),
  ];
}

export function PlatformTopbar() {
  const pathname = usePathname();
  const crumbs = buildBreadcrumb(pathname);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/60 bg-background/85 px-3 backdrop-blur-md md:px-5">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-5" />

      <nav className="flex min-w-0 items-center gap-1 text-sm">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <span key={c.href} className="flex items-center gap-1">
              {i > 0 && (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
              )}
              {last ? (
                <span className="truncate font-medium text-foreground">{c.label}</span>
              ) : (
                <Link
                  href={c.href}
                  className="truncate text-muted-foreground transition-colors hover:text-foreground"
                >
                  {c.label}
                </Link>
              )}
            </span>
          );
        })}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <div className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="搜索站点 / 区域 / 告警…"
            className="h-9 w-72 rounded-md border-border/70 bg-card/40 pl-8 text-sm placeholder:text-muted-foreground/70 focus-visible:ring-[var(--neon-cyan)]/40"
            aria-label="搜索"
          />
          <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-border/60 bg-muted/30 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground md:inline-block">
            ⌘K
          </kbd>
        </div>

        <Badge
          variant="outline"
          className="hidden gap-1.5 border-[var(--neon-lime)]/40 text-[var(--neon-lime)] sm:inline-flex"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--neon-lime)] shadow-[0_0_8px_var(--neon-lime)]" />
          API · 在线
        </Badge>

        <Button
          size="icon"
          variant="ghost"
          className="relative"
          aria-label="通知"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[var(--neon-rose)] shadow-[0_0_8px_var(--neon-rose)]" />
        </Button>

        <ThemeModeToggle />
      </div>
    </header>
  );
}
