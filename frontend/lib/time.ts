/**
 * 时间工具：基于 dayjs，统一中文相对时间 + 24h 时钟。
 *
 * 注：dayjs 全局插件只需注册一次（本模块顶层导入即生效）。
 */

import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/zh-cn";

dayjs.extend(relativeTime);
dayjs.locale("zh-cn");

/** 后端返回 naive UTC 字符串（无 Z 后缀），需要补 Z 让 dayjs 正确识别为 UTC */
function normalizeUtc(input: string | Date): string {
  if (input instanceof Date) {
    return input.toISOString();
  }
  // 匹配 ISO 格式但无 Z，如 2026-04-28T14:05:28 或 2026-04-28T14:05:28.111103
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(input)) {
    return input + "Z";
  }
  return input;
}

/** "2026-04-26T14:32:47" → "3 分钟前"。null/无效 → "—" */
export function formatRelative(input: string | Date | null | undefined): string {
  if (!input) return "—";
  const d = dayjs(normalizeUtc(input));
  if (!d.isValid()) return "—";
  return d.fromNow();
}

/** "2026-04-26 14:32:47" 完整时间戳（用于详情 tooltip） */
export function formatDateTime(input: string | Date | null | undefined): string {
  if (!input) return "—";
  const d = dayjs(normalizeUtc(input));
  if (!d.isValid()) return "—";
  return d.format("YYYY-MM-DD HH:mm:ss");
}

/** "14:32:47" 24h 时钟（LiveTicker 用） */
export function formatClock(input: string | Date | null | undefined): string {
  if (!input) return "--:--:--";
  const d = dayjs(normalizeUtc(input));
  if (!d.isValid()) return "--:--:--";
  return d.format("HH:mm:ss");
}

/** "2026-04-26" 日期（LiveTicker 顶部展示） */
export function formatDate(input: string | Date | null | undefined): string {
  if (!input) return "—";
  const d = dayjs(normalizeUtc(input));
  if (!d.isValid()) return "—";
  return d.format("YYYY-MM-DD");
}
