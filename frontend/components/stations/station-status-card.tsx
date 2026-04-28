"use client";

import { Bike, ParkingSquare, Gauge, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber, formatOccupancy } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { StationDetail } from "@/lib/api/client";

interface StationStatusCardProps {
  station?: StationDetail;
  isLoading: boolean;
}

export function StationStatusCards({ station, isLoading }: StationStatusCardProps) {
  if (isLoading || !station) {
    return <StatusSkeleton />;
  }

  const cards = [
    {
      label: "可用车辆",
      value: formatNumber(station.bikes_available),
      icon: <Bike className="h-4 w-4" />,
      accent: "cyan" as const,
      desc: `容量 ${station.capacity}`,
    },
    {
      label: "可用桩位",
      value: formatNumber(station.docks_available),
      icon: <ParkingSquare className="h-4 w-4" />,
      accent: "violet" as const,
      desc: `已用 ${station.capacity - station.docks_available}`,
    },
    {
      label: "总容量",
      value: formatNumber(station.capacity),
      icon: <Gauge className="h-4 w-4" />,
      accent: "amber" as const,
      desc: `占用 ${formatOccupancy(station.occupancy_rate)}`,
    },
    {
      label: "占用率",
      value: formatOccupancy(station.occupancy_rate),
      icon: <Activity className="h-4 w-4" />,
      accent: "rose" as const,
      desc: station.status === "active" ? "运营中" : station.status,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.label} {...c} />
      ))}
    </div>
  );
}

function Card({
  label,
  value,
  icon,
  accent,
  desc,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: "cyan" | "violet" | "amber" | "rose";
  desc: string;
}) {
  const colorMap = {
    cyan: "var(--neon-cyan)",
    violet: "var(--neon-violet)",
    amber: "var(--neon-amber)",
    rose: "var(--neon-rose)",
  };
  const c = colorMap[accent];

  return (
    <div className="rounded-xl border border-border/40 bg-card/40 p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        <span style={{ color: c }}>{icon}</span>
        {label}
      </div>
      <div className="text-2xl font-semibold tabular-nums text-foreground">
        {value}
      </div>
      <div className="text-[11px] text-muted-foreground">{desc}</div>
    </div>
  );
}

function StatusSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border/40 bg-card/40 p-4 flex flex-col gap-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}
