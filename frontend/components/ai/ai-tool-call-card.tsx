"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Wrench, ExternalLink } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { AiToolCall } from "@/types/ai";

/** 站点 code 正则：XX-XX-SNNN */
const STATION_CODE_RE = /\b[A-Z]{2}-[A-Z]{2}-S\d{3}\b/g;
/** 区域 code 正则：XX-XX */
const REGION_CODE_RE = /\b[A-Z]{2}-[A-Z]{2}\b/g;

interface AiToolCallCardProps {
  toolCall: AiToolCall;
  className?: string;
}

/** 从文本中提取区域 code，排除已被站点 code 占用的部分 */
function extractRegionCodes(text: string): string[] {
  const textWithoutStations = text.replace(STATION_CODE_RE, " ");
  const matches = textWithoutStations.match(REGION_CODE_RE) || [];
  return [...new Set(matches)];
}

export function AiToolCallCard({ toolCall, className }: AiToolCallCardProps) {
  const [expanded, setExpanded] = useState(false);

  const isCompleted = toolCall.status === "completed";
  const isError = toolCall.status === "error";

  // 从参数和结果中提取站点 code，去重，最多 5 个
  const codesFromArgs = toolCall.arguments.match(STATION_CODE_RE) || [];
  const codesFromResult = toolCall.result?.match(STATION_CODE_RE) || [];
  const stationCodes = [...new Set([...codesFromArgs, ...codesFromResult])].slice(0, 5);

  // 从参数和结果中提取区域 code，去重，最多 5 个
  const regionCodes = [...new Set([
    ...extractRegionCodes(toolCall.arguments),
    ...extractRegionCodes(toolCall.result || ""),
  ])].slice(0, 5);

  return (
    <div
      className={cn(
        "rounded-lg border text-xs overflow-hidden",
        "border-lime-500/20 bg-lime-500/[0.06]",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2 hover:bg-lime-500/[0.08] transition-colors"
      >
        <Wrench className="h-3.5 w-3.5 text-lime-400 shrink-0" />
        <span className="font-medium text-lime-300 truncate">
          调用 {toolCall.name}
        </span>
        <span
          className={cn(
            "ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
            isCompleted
              ? "bg-lime-500/15 text-lime-400"
              : isError
                ? "bg-rose-500/15 text-rose-400"
                : "bg-amber-500/15 text-amber-400 animate-pulse",
          )}
        >
          {isCompleted ? "已完成" : isError ? "失败" : "运行中"}
        </span>
        {expanded ? (
          <ChevronUp className="h-3 w-3 text-lime-400/60 shrink-0" />
        ) : (
          <ChevronDown className="h-3 w-3 text-lime-400/60 shrink-0" />
        )}
      </button>

      {/* 站点 code 快捷链接 */}
      {stationCodes.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-lime-500/10 px-3 py-1.5">
          <span className="text-lime-400/60 text-[10px] shrink-0">查看站点:</span>
          {stationCodes.map((code) => (
            <Link
              key={code}
              href={`/stations/${code}`}
              className="inline-flex items-center gap-0.5 rounded bg-lime-500/10 px-1.5 py-0.5 text-[10px] text-lime-300 hover:bg-lime-500/20 hover:text-lime-200 transition-colors"
            >
              {code}
              <ExternalLink className="h-2.5 w-2.5" />
            </Link>
          ))}
        </div>
      )}

      {/* 区域 code 快捷链接 */}
      {regionCodes.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-lime-500/10 px-3 py-1.5">
          <span className="text-lime-400/60 text-[10px] shrink-0">查看区域:</span>
          {regionCodes.map((code) => (
            <Link
              key={code}
              href={`/regions?highlight=${code}`}
              className="inline-flex items-center gap-0.5 rounded bg-violet-500/10 px-1.5 py-0.5 text-[10px] text-violet-300 hover:bg-violet-500/20 hover:text-violet-200 transition-colors"
            >
              {code}
              <ExternalLink className="h-2.5 w-2.5" />
            </Link>
          ))}
        </div>
      )}

      {expanded && (
        <div className="border-t border-lime-500/10 px-3 py-2 space-y-1.5">
          <div>
            <span className="text-lime-400/60">参数：</span>
            <pre className="mt-0.5 whitespace-pre-wrap break-all text-lime-300/80 font-mono text-[11px] leading-relaxed">
              {toolCall.arguments}
            </pre>
          </div>
          {toolCall.result && (
            <div>
              <span className="text-lime-400/60">结果：</span>
              <pre className="mt-0.5 whitespace-pre-wrap break-all text-lime-300/80 font-mono text-[11px] leading-relaxed max-h-40 overflow-y-auto">
                {toolCall.result}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
