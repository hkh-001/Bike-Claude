import Link from "next/link";
import { ArrowLeft, Construction, type LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";

type StubPageProps = {
  title: string;
  description: string;
  stage: string;
  icon: LucideIcon;
  upcoming: string[];
};

export function PlaceholderPage({
  title,
  description,
  stage,
  icon: Icon,
  upcoming,
}: StubPageProps) {
  return (
    <>
      <PageHeader
        eyebrow="Module"
        title={title}
        stage={stage}
        description={description}
        actions={
          <Button render={<Link href="/" />} size="sm" variant="ghost">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> 返回总览
          </Button>
        }
      />

      <Card className="relative overflow-hidden border-dashed border-border/60 bg-card/40 backdrop-blur">
        <div
          className={cn(
            "pointer-events-none absolute inset-0 opacity-[0.18]",
            "[background:radial-gradient(circle_at_top_right,var(--neon-cyan),transparent_55%),radial-gradient(circle_at_bottom_left,var(--neon-violet),transparent_60%)]",
          )}
        />
        <CardContent className="relative flex flex-col gap-5 py-10 sm:flex-row sm:items-center sm:gap-8">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-[var(--neon-cyan)]/40 bg-card/60 text-[var(--neon-cyan)] shadow-[0_0_24px_color-mix(in_oklch,var(--neon-cyan)_18%,transparent)]">
            <Icon className="h-7 w-7" strokeWidth={1.75} />
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              <Construction className="h-3 w-3" />
              <span>模块即将上线</span>
              <Badge
                variant="outline"
                className="border-[var(--neon-amber)]/40 px-1.5 py-0 text-[10px] tracking-[0.16em] text-[var(--neon-amber)]"
              >
                {stage} 阶段
              </Badge>
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              {title} · 正在规划
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              本页将于「{stage}」阶段实现。当前 M0 + M1 仅落地后端数据骨架与
              AppShell 框架，业务页面正按里程碑顺序推进。
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/50 backdrop-blur">
        <CardContent className="space-y-4 py-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              即将提供的能力
            </h3>
            <Badge
              variant="outline"
              className="border-border/50 px-2 py-0 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
            >
              ROADMAP
            </Badge>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {upcoming.map((line) => (
              <li
                key={line}
                className="flex items-start gap-2.5 rounded-md border border-border/40 bg-card/40 px-3 py-2.5 text-sm text-foreground/90"
              >
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--neon-cyan)] shadow-[0_0_8px_var(--neon-cyan)]" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </>
  );
}
