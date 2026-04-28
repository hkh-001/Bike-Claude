"use client";

import { useEffect, useState } from "react";
import { Cog, CheckCircle2 } from "lucide-react";
import { useTheme } from "next-themes";
import { PageHeader } from "@/components/layout/page-header";
import { useAppSettings } from "@/lib/hooks/use-app-settings";
import { AppearanceSettings } from "@/components/settings/appearance-settings";
import { RefreshSettings } from "@/components/settings/refresh-settings";
import { AlertThresholdSettings } from "@/components/settings/alert-threshold-settings";
import { AiStatusCard } from "@/components/settings/ai-status-card";
import { DataSourceStatusCard } from "@/components/settings/data-source-status-card";
import { ResetSettingsCard } from "@/components/settings/reset-settings-card";

export default function SettingsPage() {
  const { settings, update, reset, isLoaded } = useAppSettings();
  const { setTheme, resolvedTheme } = useTheme();
  const [savedAt, setSavedAt] = useState<string | null>(null);

  // 同步 themeMode 变更到 next-themes
  useEffect(() => {
    if (isLoaded && settings.themeMode !== resolvedTheme) {
      setTheme(settings.themeMode);
    }
  }, [settings.themeMode, isLoaded, setTheme, resolvedTheme]);

  const handleUpdate = <K extends keyof typeof settings>(
    key: K,
    value: (typeof settings)[K],
  ) => {
    update(key, value);
    setSavedAt(
      new Date().toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    );
  };

  if (!isLoaded) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="系统设置"
          description="配置平台显示偏好、刷新频率、告警阈值与 AI 状态"
          stage="M5"
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-xl border border-border/40 bg-card/40"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="系统设置"
        description="配置平台显示偏好、刷新频率、告警阈值与 AI 状态"
        stage="M5"
        actions={
          savedAt ? (
            <div className="flex items-center gap-1.5 text-[11px] text-[var(--neon-lime)]">
              <CheckCircle2 className="h-3.5 w-3.5" />
              已保存于 {savedAt}
            </div>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Left column */}
        <div className="flex flex-col gap-4">
          <SettingsCard icon={Cog}>
            <AppearanceSettings
              value={settings.themeMode}
              onChange={(v) => handleUpdate("themeMode", v)}
            />
          </SettingsCard>

          <SettingsCard>
            <RefreshSettings
              dashboardInterval={settings.dashboardRefreshInterval}
              alertInterval={settings.alertRefreshInterval}
              onDashboardChange={(v) => handleUpdate("dashboardRefreshInterval", v)}
              onAlertChange={(v) => handleUpdate("alertRefreshInterval", v)}
            />
          </SettingsCard>

          <SettingsCard>
            <AlertThresholdSettings
              emptyThreshold={settings.emptyBikeThreshold}
              fullThreshold={settings.fullOccupancyThreshold}
              onEmptyChange={(v) => handleUpdate("emptyBikeThreshold", v)}
              onFullChange={(v) => handleUpdate("fullOccupancyThreshold", v)}
            />
          </SettingsCard>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          <SettingsCard>
            <AiStatusCard
              tokenBudget={settings.aiTokenBudget}
              streamingEnabled={settings.aiStreamingEnabled}
              onTokenBudgetChange={(v) => handleUpdate("aiTokenBudget", v)}
              onStreamingToggle={(v) => handleUpdate("aiStreamingEnabled", v)}
            />
          </SettingsCard>

          <SettingsCard>
            <DataSourceStatusCard />
          </SettingsCard>

          <SettingsCard>
            <ResetSettingsCard
              onReset={() => {
                reset();
                setSavedAt(
                  new Date().toLocaleTimeString("zh-CN", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  }),
                );
              }}
            />
          </SettingsCard>
        </div>
      </div>
    </div>
  );
}

function SettingsCard({
  children,
  icon: Icon,
}: {
  children: React.ReactNode;
  icon?: typeof Cog;
}) {
  return (
    <div className="rounded-xl border border-border/40 bg-card/40 p-4 backdrop-blur-sm">
      {children}
    </div>
  );
}
