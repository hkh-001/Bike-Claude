"use client";

import { AlertOctagon, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ErrorStateProps = {
  title?: string;
  description?: string;
  error?: unknown;
  onRetry?: () => void;
  retryLabel?: string;
  action?: ReactNode;
  className?: string;
};

function formatError(err: unknown): string | undefined {
  if (!err) return undefined;
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

export function ErrorState({
  title = "数据加载失败",
  description = "请稍后重试，若问题持续请检查后端服务。",
  error,
  onRetry,
  retryLabel = "重试",
  action,
  className,
}: ErrorStateProps) {
  const detail = formatError(error);
  return (
    <Card
      className={cn(
        "border-[var(--neon-rose)]/40 bg-card/40 backdrop-blur",
        className,
      )}
      role="alert"
    >
      <CardContent className="flex flex-col gap-3 py-6 sm:flex-row sm:items-start">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklch,var(--neon-rose)_15%,transparent)] text-[var(--neon-rose)]">
          <AlertOctagon className="h-5 w-5" />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
          {detail && (
            <code className="mt-1 block max-w-full overflow-x-auto rounded border border-border/60 bg-muted/30 px-2 py-1 font-mono text-[11px] text-muted-foreground">
              {detail}
            </code>
          )}
        </div>
        <div className="flex items-center gap-2 self-start">
          {onRetry && (
            <Button size="sm" variant="outline" onClick={onRetry}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              {retryLabel}
            </Button>
          )}
          {action}
        </div>
      </CardContent>
    </Card>
  );
}
