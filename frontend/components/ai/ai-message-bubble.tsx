"use client";

import { cn } from "@/lib/utils";
import { Bot, User, AlertTriangle, Lightbulb, CircleDot } from "lucide-react";
import Link from "next/link";
import type { AiMessage } from "@/types/ai";
import { AiToolCallCard } from "./ai-tool-call-card";

/** 站点 code 正则：XX-XX-SNNN */
const STATION_CODE_RE = /\b[A-Z]{2}-[A-Z]{2}-S\d{3}\b/g;
/** 区域 code 正则：XX-XX */
const REGION_CODE_RE = /\b[A-Z]{2}-[A-Z]{2}\b/g;

type TextSegment =
  | { type: "text"; content: string }
  | { type: "station"; code: string }
  | { type: "region"; code: string };

/** 解析文本，按优先级识别站点 code → 区域 code */
function parseSegments(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let lastIndex = 0;

  const stationMatches: { index: number; code: string; length: number }[] = [];
  const stationRegex = new RegExp(STATION_CODE_RE.source, "g");
  let m: RegExpExecArray | null;
  while ((m = stationRegex.exec(text)) !== null) {
    stationMatches.push({ index: m.index, code: m[0], length: m[0].length });
  }

  for (const match of stationMatches) {
    if (match.index > lastIndex) {
      const gap = text.slice(lastIndex, match.index);
      segments.push(...parseRegionSegments(gap));
    }
    segments.push({ type: "station", code: match.code });
    lastIndex = match.index + match.length;
  }

  if (lastIndex < text.length) {
    segments.push(...parseRegionSegments(text.slice(lastIndex)));
  }

  return segments;
}

function parseRegionSegments(gap: string): TextSegment[] {
  const segs: TextSegment[] = [];
  let regionLast = 0;
  const regionRegex = new RegExp(REGION_CODE_RE.source, "g");
  let rm: RegExpExecArray | null;
  while ((rm = regionRegex.exec(gap)) !== null) {
    if (rm.index > regionLast) {
      segs.push({ type: "text", content: gap.slice(regionLast, rm.index) });
    }
    segs.push({ type: "region", code: rm[0] });
    regionLast = regionRegex.lastIndex;
  }
  if (regionLast < gap.length) {
    segs.push({ type: "text", content: gap.slice(regionLast) });
  }
  return segs;
}

function LinkifyText({ text }: { text: string }) {
  const segments = parseSegments(text);
  return (
    <>
      {segments.map((seg, i) => {
        if (seg.type === "station") {
          return (
            <Link
              key={i}
              href={`/stations/${seg.code}`}
              className="text-cyan-400 hover:text-cyan-300 hover:underline underline-offset-2 transition-colors"
            >
              {seg.code}
            </Link>
          );
        }
        if (seg.type === "region") {
          return (
            <Link
              key={i}
              href={`/regions?highlight=${seg.code}`}
              className="text-violet-400 hover:text-violet-300 hover:underline underline-offset-2 transition-colors"
            >
              {seg.code}
            </Link>
          );
        }
        return <span key={i}>{seg.content}</span>;
      })}
    </>
  );
}

// ---------------------------------------------------------------------------
// 内联渲染：处理加粗、风险徽章、普通文本
// ---------------------------------------------------------------------------

const RISK_BADGE_RE = /\*\*([🔴🟡🟢⚫])\s*([^*]+)\*\*/g;
const BOLD_RE = /\*\*(.*?)\*\*/g;

function renderInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;

  // 先匹配风险徽章 **🔴 XXX**
  const riskMatches: { index: number; length: number; emoji: string; label: string }[] = [];
  let rm: RegExpExecArray | null;
  while ((rm = RISK_BADGE_RE.exec(text)) !== null) {
    riskMatches.push({
      index: rm.index,
      length: rm[0].length,
      emoji: rm[1],
      label: rm[2].trim(),
    });
  }

  for (const match of riskMatches) {
    if (match.index > lastIndex) {
      nodes.push(...renderBoldSegments(text.slice(lastIndex, match.index)));
    }
    nodes.push(
      <RiskBadge key={`risk-${match.index}`} emoji={match.emoji} label={match.label} />
    );
    lastIndex = match.index + match.length;
  }

  if (lastIndex < text.length) {
    nodes.push(...renderBoldSegments(text.slice(lastIndex)));
  }

  if (nodes.length === 0) {
    nodes.push(<LinkifyText key="plain" text={text} />);
  }

  return nodes;
}

function renderBoldSegments(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;

  let bm: RegExpExecArray | null;
  while ((bm = BOLD_RE.exec(text)) !== null) {
    if (bm.index > lastIndex) {
      nodes.push(<LinkifyText key={`txt-${bm.index}`} text={text.slice(lastIndex, bm.index)} />);
    }
    nodes.push(
      <strong key={`bold-${bm.index}`} className="font-semibold text-slate-100">
        <LinkifyText text={bm[1]} />
      </strong>
    );
    lastIndex = bm.index + bm[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(<LinkifyText key={`txt-end`} text={text.slice(lastIndex)} />);
  }

  if (nodes.length === 0) {
    nodes.push(<LinkifyText key="plain" text={text} />);
  }

  return nodes;
}

function RiskBadge({ emoji, label }: { emoji: string; label: string }) {
  const config: Record<string, { bg: string; text: string; border: string; dot: string }> = {
    "🔴": {
      bg: "bg-rose-500/10",
      text: "text-rose-300",
      border: "border-rose-500/30",
      dot: "text-rose-400",
    },
    "🟡": {
      bg: "bg-amber-500/10",
      text: "text-amber-300",
      border: "border-amber-500/30",
      dot: "text-amber-400",
    },
    "🟢": {
      bg: "bg-emerald-500/10",
      text: "text-emerald-300",
      border: "border-emerald-500/30",
      dot: "text-emerald-400",
    },
    "⚫": {
      bg: "bg-slate-500/10",
      text: "text-slate-300",
      border: "border-slate-500/30",
      dot: "text-slate-400",
    },
  };
  const c = config[emoji] ?? config["⚫"];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium",
        c.bg,
        c.text,
        c.border
      )}
    >
      <CircleDot className={cn("h-3 w-3", c.dot)} />
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// 区块组件
// ---------------------------------------------------------------------------

function SectionHeader({ text }: { text: string }) {
  // 提取 emoji（如果有）
  const emojiMatch = text.match(/^(\p{Emoji}️?\s*)/u);
  const emoji = emojiMatch ? emojiMatch[1].trim() : "";
  const title = emoji ? text.slice(emojiMatch![1].length) : text;

  return (
    <div className="mt-3 mb-1.5 flex items-center gap-2 border-l-2 border-cyan-500/50 pl-2.5">
      {emoji && <span className="text-base leading-none">{emoji}</span>}
      <h4 className="text-sm font-semibold text-cyan-200">{title}</h4>
    </div>
  );
}

function TipCard({ text }: { text: string }) {
  const content = text.replace(/^💡\s*/, "");
  return (
    <div className="my-2 flex items-start gap-2 rounded-lg border border-amber-500/15 bg-amber-500/[0.06] px-3 py-2">
      <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
      <span className="text-xs leading-relaxed text-amber-100/90">{renderInline(content)}</span>
    </div>
  );
}

function BulletItem({ text }: { text: string }) {
  return (
    <div className="flex gap-2 pl-1 py-0.5">
      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-cyan-400/50" />
      <span className="text-sm leading-relaxed text-slate-200">{renderInline(text)}</span>
    </div>
  );
}

function NumberItem({ num, text }: { num: string; text: string }) {
  return (
    <div className="flex gap-2 pl-1 py-0.5">
      <span className="mt-0.5 shrink-0 w-4 text-right font-mono text-xs text-cyan-400/70">
        {num}.
      </span>
      <span className="text-sm leading-relaxed text-slate-200">{renderInline(text)}</span>
    </div>
  );
}

function Paragraph({ text }: { text: string }) {
  return (
    <p className="py-0.5 text-sm leading-relaxed text-slate-200">{renderInline(text)}</p>
  );
}

// ---------------------------------------------------------------------------
// 表格
// ---------------------------------------------------------------------------

function DataTable({ lines }: { lines: string[] }) {
  // 过滤掉分隔线 |---|---|
  const rows = lines.filter((l) => l.trim().replace(/\|/g, "").replace(/-/g, "").trim() !== "");
  if (rows.length === 0) return null;

  const parseRow = (line: string): string[] => {
    return line
      .split("|")
      .map((c) => c.trim())
      .filter((c) => c !== "");
  };

  const headerCells = parseRow(rows[0]);
  const dataRows = rows.slice(1).filter((r) => {
    const cells = parseRow(r);
    return cells.length > 0 && !cells.every((c) => /^-+$/.test(c));
  });

  return (
    <div className="my-2 overflow-x-auto rounded-lg border border-white/8">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-white/8 bg-slate-800/60">
            {headerCells.map((h, i) => (
              <th
                key={i}
                className="px-3 py-2 text-left font-medium text-slate-400"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dataRows.map((row, ri) => {
            const cells = parseRow(row);
            return (
              <tr
                key={ri}
                className={cn(
                  "border-b border-white/[0.04] transition-colors hover:bg-white/[0.03]",
                  ri === dataRows.length - 1 && "border-b-0"
                )}
              >
                {cells.map((c, ci) => (
                  <td key={ci} className="px-3 py-1.5 text-slate-300">
                    {renderInline(c)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SimpleMarkdown 主组件
// ---------------------------------------------------------------------------

function SimpleMarkdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 空行
    if (trimmed === "") {
      elements.push(<div key={i} className="h-1" />);
      i++;
      continue;
    }

    // 分隔线
    if (trimmed === "---") {
      elements.push(
        <hr key={i} className="border-t border-white/10 my-2" />
      );
      i++;
      continue;
    }

    // 标题 ###
    if (trimmed.startsWith("### ")) {
      elements.push(<SectionHeader key={i} text={trimmed.slice(4)} />);
      i++;
      continue;
    }

    if (trimmed.startsWith("## ")) {
      elements.push(<SectionHeader key={i} text={trimmed.slice(3)} />);
      i++;
      continue;
    }

    // 引用块 > 💡
    if (trimmed.startsWith("> ")) {
      elements.push(<TipCard key={i} text={trimmed.slice(2)} />);
      i++;
      continue;
    }

    // 表格
    if (trimmed.startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      elements.push(<DataTable key={`table-${i}`} lines={tableLines} />);
      continue;
    }

    // 无序列表
    if (trimmed.startsWith("- ")) {
      elements.push(<BulletItem key={i} text={trimmed.slice(2)} />);
      i++;
      continue;
    }

    // 有序列表
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      elements.push(<NumberItem key={i} num={numMatch[1]} text={numMatch[2]} />);
      i++;
      continue;
    }

    // 普通段落
    elements.push(<Paragraph key={i} text={line} />);
    i++;
  }

  return <div className="space-y-0.5">{elements}</div>;
}

// ---------------------------------------------------------------------------
// AiMessageBubble
// ---------------------------------------------------------------------------

interface AiMessageBubbleProps {
  message: AiMessage;
  isStreaming?: boolean;
}

export function AiMessageBubble({
  message,
  isStreaming,
}: AiMessageBubbleProps) {
  const isUser = message.role === "user";
  const isError = message.role === "error";
  const isAssistant = message.role === "assistant";

  return (
    <div
      className={cn(
        "flex gap-2.5",
        isUser ? "flex-row-reverse" : "flex-row",
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-cyan-500/15 ring-1 ring-cyan-500/30"
            : isError
              ? "bg-rose-500/15 ring-1 ring-rose-500/30"
              : "bg-violet-500/15 ring-1 ring-violet-500/30",
        )}
      >
        {isUser ? (
          <User className="h-3.5 w-3.5 text-cyan-400" />
        ) : isError ? (
          <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
        ) : (
          <Bot className="h-3.5 w-3.5 text-violet-400" />
        )}
      </div>

      {/* Content */}
      <div className={cn("flex max-w-[85%] flex-col", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "relative rounded-xl px-3.5 py-2.5 text-sm leading-relaxed",
            isUser
              ? "bg-cyan-500/10 text-cyan-100 border border-cyan-500/20"
              : isError
                ? "bg-rose-500/10 text-rose-100 border border-rose-500/20"
                : "bg-slate-800/60 text-slate-100 border border-white/8",
          )}
        >
          <SimpleMarkdown text={message.content} />
          {isStreaming && isAssistant && (
            <span className="ml-0.5 inline-block h-3.5 w-1 animate-pulse bg-violet-400/60 align-middle">
            </span>
          )}
        </div>

        {/* Tool calls */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-1.5 w-full space-y-1">
            {message.toolCalls.map((tc) => (
              <AiToolCallCard key={tc.id} toolCall={tc} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
