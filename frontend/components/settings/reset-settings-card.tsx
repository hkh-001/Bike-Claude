"use client";

import { RotateCcw, AlertTriangle } from "lucide-react";

interface ResetSettingsCardProps {
  onReset: () => void;
}

export function ResetSettingsCard({ onReset }: ResetSettingsCardProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-foreground">重置</h3>
        <p className="text-xs text-muted-foreground">
          将所有配置恢复为平台默认值
        </p>
      </div>

      <button
        type="button"
        onClick={onReset}
        className="inline-flex items-center gap-1.5 self-start rounded-md border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-300 transition-colors hover:bg-rose-500/20 hover:text-rose-200"
      >
        <RotateCcw className="h-3 w-3" />
        恢复默认设置
      </button>

      <div className="flex items-start gap-1.5 rounded-md border border-amber-500/10 bg-amber-500/[0.06] px-3 py-2 text-[11px] text-amber-300/80">
        <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
        恢复默认将清除已保存的本地偏好，且不可撤销。
      </div>
    </div>
  );
}
