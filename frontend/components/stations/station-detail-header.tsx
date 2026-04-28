"use client";

import { ArrowLeft, MapPin } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { StationDetail } from "@/lib/api/client";

const RISK_ACCENT: Record<string, { color: string; label: string }> = {
  normal: { color: "var(--neon-lime)", label: "正常" },
  empty: { color: "var(--neon-amber)", label: "空车" },
  full: { color: "var(--neon-rose)", label: "满桩" },
  offline: { color: "var(--neon-slate)", label: "离线" },
  abnormal: { color: "var(--neon-violet)", label: "异常" },
};

interface StationDetailHeaderProps {
  station?: StationDetail;
  isLoading: boolean;
}

export function StationDetailHeader({ station, isLoading }: StationDetailHeaderProps) {
  if (isLoading || !station) {
    return <HeaderSkeleton />;
  }

  const risk = RISK_ACCENT[station.risk_type] ?? { color: "var(--neon-cyan)", label: station.risk_type };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Link
          href="/stations"
          className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          返回站点列表
        </Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10 ring-1 ring-cyan-500/25">
            <MapPin className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-foreground">{station.name}</h1>
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1"
                style={{
                  color: risk.color,
                  backgroundColor: `${risk.color}14`,
                  borderColor: `${risk.color}33`,
                }}
              >
                {risk.label}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono text-[10px] bg-muted/30 px-1.5 py-0.5 rounded">{station.station_code}</span>
              <span>·</span>
              <span>{station.region_name ?? "—"}</span>
              <span>·</span>
              <span className="font-mono text-[10px]">
                {station.lat.toFixed(4)}, {station.lng.toFixed(4)}
              </span>
            </div>
          </div>
        </div>

        {station.updated_at && (
          <Badge variant="outline" className="text-[10px] text-muted-foreground border-border/40 w-fit">
            更新于 {new Date(station.updated_at).toLocaleString("zh-CN", {
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Badge>
        )}
      </div>
    </div>
  );
}

function HeaderSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-8 w-28" />
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
      </div>
    </div>
  );
}
