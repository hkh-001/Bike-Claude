/**
 * 业务展示格式化工具：千分位 / 占用率 / 告警等级。
 *
 * 约定：
 * - 数据来源全部由后端 `/api/dashboard/summary` 提供。
 * - 占用率字段（avg_occupancy_rate / occupancy_rate）后端为 0~1 的小数，
 *   展示层一律乘 100 + 1 位小数。
 */

const NUMBER_FORMAT = new Intl.NumberFormat("zh-CN");

/** 整数千分位，nullish 走占位 "—" */
export function formatNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return NUMBER_FORMAT.format(Math.round(value));
}

/** 0~1 占用率 → "51.7%"（默认 1 位小数） */
export function formatOccupancy(
  rate: number | null | undefined,
  digits = 1,
): string {
  if (rate == null || Number.isNaN(rate)) return "—";
  return `${(rate * 100).toFixed(digits)}%`;
}

/** 0~100 百分数（已经是百分制，比如 24h 完成度）→ "82.3%" */
export function formatPercent(
  value: number | null | undefined,
  digits = 1,
): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toFixed(digits)}%`;
}

export type AlertLevel = "info" | "warning" | "critical";

/** 告警等级中文标签 */
export function alertLevelLabel(level: AlertLevel | string): string {
  switch (level) {
    case "critical":
      return "紧急";
    case "warning":
      return "警告";
    case "info":
      return "提示";
    default:
      return level;
  }
}

/** 告警等级对应的 neon token 颜色（CSS 变量名，非完整 var()） */
export function alertLevelAccent(
  level: AlertLevel | string,
): "rose" | "amber" | "cyan" {
  switch (level) {
    case "critical":
      return "rose";
    case "warning":
      return "amber";
    case "info":
    default:
      return "cyan";
  }
}

/** ETL feed 状态中文 + accent */
export function etlStatusLabel(status: string | null | undefined): string {
  if (!status) return "未运行";
  switch (status) {
    case "success":
      return "成功";
    case "failed":
      return "失败";
    case "running":
      return "进行中";
    case "skipped":
      return "跳过";
    default:
      return status;
  }
}

export function etlStatusAccent(
  status: string | null | undefined,
): "lime" | "rose" | "cyan" | "muted" {
  if (!status) return "muted";
  switch (status) {
    case "success":
      return "lime";
    case "failed":
      return "rose";
    case "running":
      return "cyan";
    default:
      return "muted";
  }
}

/** 时长 ms → 友好字符串（"1.2s" / "850ms"） */
export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || Number.isNaN(ms)) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}
