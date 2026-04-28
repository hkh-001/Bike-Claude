"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { navItems, platformBrand, type NavItem } from "./nav-items";

type GroupedNav = Record<string, NavItem[]>;

function groupItems(items: NavItem[]): GroupedNav {
  return items.reduce<GroupedNav>((acc, item) => {
    (acc[item.group] ??= []).push(item);
    return acc;
  }, {});
}

export function PlatformSidebar() {
  const pathname = usePathname();
  const grouped = useMemo(() => groupItems(navItems), []);
  const BrandIcon = platformBrand.icon;

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <div className="flex items-center gap-3 px-2 py-1.5">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--neon-cyan)] to-[var(--neon-violet)] text-[color:var(--primary-foreground)] shadow-[0_0_18px_color-mix(in_oklch,var(--neon-cyan)_30%,transparent)]">
            <BrandIcon className="h-4 w-4" strokeWidth={2.5} />
          </div>
          <div className="flex min-w-0 flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="font-semibold tracking-tight text-foreground">
              {platformBrand.name}
            </span>
            <span className="truncate text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {platformBrand.tagline}
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        {Object.entries(grouped).map(([groupName, items]) => (
          <SidebarGroup key={groupName}>
            <SidebarGroupLabel>{groupName}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.href);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        render={<Link href={item.href} />}
                        isActive={isActive}
                        tooltip={item.label}
                        className={cn(
                          "group/nav data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground",
                          isActive &&
                            "[&>svg]:text-[var(--neon-cyan)]",
                        )}
                      >
                        <Icon strokeWidth={2} />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                      <SidebarMenuBadge
                        className={cn(
                          "text-[10px] font-medium tracking-wider",
                          item.ready
                            ? "text-[var(--neon-lime)]"
                            : "text-muted-foreground",
                        )}
                      >
                        {item.stage}
                      </SidebarMenuBadge>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <div className="flex flex-col gap-1.5 rounded-md border border-sidebar-border/60 bg-sidebar-accent/40 p-3 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          <div className="flex items-center justify-between">
            <span className="font-medium text-foreground">当前阶段</span>
            <Badge variant="outline" className="border-[var(--neon-cyan)]/40 text-[var(--neon-cyan)]">
              M0 · M1
            </Badge>
          </div>
          <p className="leading-relaxed">
            后端：FastAPI + SQLite mock 已就绪。前端：AppShell 骨架完成，
            业务页面在 M2 起逐步落地。
          </p>
          <span className="mt-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/80">
            v{platformBrand.version}
          </span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
