import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({
  title = "暂无数据",
  description = "当前条件下没有可显示的内容。",
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <Card
      className={cn(
        "border-dashed border-border/60 bg-card/30 backdrop-blur",
        className,
      )}
    >
      <CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/40 text-muted-foreground">
          {icon ?? <Inbox className="h-5 w-5" />}
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
        {action && <div className="mt-1">{action}</div>}
      </CardContent>
    </Card>
  );
}
