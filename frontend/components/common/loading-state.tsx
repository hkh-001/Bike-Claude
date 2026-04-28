import { ReactNode } from "react";
import { Loader2 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type LoadingStateProps = {
  title?: string;
  description?: string;
  variant?: "card" | "skeleton" | "inline";
  rows?: number;
  className?: string;
  children?: ReactNode;
};

export function LoadingState({
  title = "加载中…",
  description,
  variant = "card",
  rows = 3,
  className,
  children,
}: LoadingStateProps) {
  if (variant === "inline") {
    return (
      <div
        className={cn(
          "flex items-center gap-2 text-sm text-muted-foreground",
          className,
        )}
        role="status"
        aria-live="polite"
      >
        <Loader2 className="h-4 w-4 animate-spin text-[var(--neon-cyan)]" />
        <span>{title}</span>
      </div>
    );
  }

  if (variant === "skeleton") {
    return (
      <div className={cn("space-y-2", className)} aria-live="polite">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  return (
    <Card
      className={cn("border-border/50 bg-card/40 backdrop-blur", className)}
      role="status"
      aria-live="polite"
    >
      <CardContent className="flex items-center gap-4 py-6">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--neon-cyan)]" />
        <div>
          <p className="text-sm font-medium text-foreground">{title}</p>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}
