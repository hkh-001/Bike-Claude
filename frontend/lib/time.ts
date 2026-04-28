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

/** "2026-04-26T14:32:47" → "3 分钟前"。null/无效 → "—" */
export function formatRelative(input: string | Date | null | undefined): string {
  if (!input) return "—";
  const d = dayjs(input);
  if (!d.isValid()) return "—";
  return d.fromNow();
}

/** "2026-04-26 14:32:47" 完整时间戳（用于详情 tooltip） */
export function formatDateTime(input: string | Date | null | undefined): string {
  if (!input) return "—";
  const d = dayjs(input);
  if (!d.isValid()) return "—";
  return d.format("YYYY-MM-DD HH:mm:ss");
}

/** "14:32:47" 24h 时钟（LiveTicker 用） */
export function formatClock(input: string | Date | null | undefined): string {
  if (!input) return "--:--:--";
  const d = dayjs(input);
  if (!d.isValid()) return "--:--:--";
  return d.format("HH:mm:ss");
}

/** "2026-04-26" 日期（LiveTicker 顶部展示） */
export function formatDate(input: string | Date | null | undefined): string {
  if (!input) return "—";
  const d = dayjs(input);
  if (!d.isValid()) return "—";
  return d.format("YYYY-MM-DD");
}
