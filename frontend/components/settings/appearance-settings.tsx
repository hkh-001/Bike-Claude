"use client";

import { MoonStar, Sun, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ThemeMode } from "@/lib/hooks/use-app-settings";

const OPTIONS: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: "dark", label: "暗色", icon: MoonStar },
  { value: "light", label: "亮色", icon: Sun },
  { value: "system", label: "跟随系统", icon: Monitor },
];

interface AppearanceSettingsProps {
  value: ThemeMode;
  onChange: (value: ThemeMode) => void;
}

export function AppearanceSettings({ value, onChange }: AppearanceSettingsProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-foreground">外观主题</h3>
        <p className="text-xs text-muted-foreground">选择平台界面主题风格</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-xs transition-all",
                active
                  ? "border-[var(--neon-cyan)]/50 bg-[var(--neon-cyan)]/10 text-[var(--neon-cyan)]"
                  : "border-border/40 bg-card/40 text-muted-foreground hover:border-border/70 hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
