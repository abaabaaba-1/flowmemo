"use client";

import { motion } from "framer-motion";
import { BookOpenCheck, Loader2, Play } from "lucide-react";
import { DEMO_CHAT_PROMPTS, DEMO_PIPELINE_INPUTS } from "@/lib/demo-data";
import type { ChatMessage } from "./journey-utils";
import { durationText, timeText } from "./journey-utils";

interface ChatTabProps {
  messages: ChatMessage[];
  isAssistantThinking: boolean;
  isComposingNote: boolean;
  onAsk: (text: string) => void;
  onNote: (text: string) => void;
}

const WAVEFORM_HEIGHTS = [40, 60, 30, 80, 50, 70, 40, 90, 60, 30, 50, 70, 40, 30];

export function ChatTab({
  messages,
  isAssistantThinking,
  isComposingNote,
  onAsk,
  onNote,
}: ChatTabProps) {
  return (
    <div className="space-y-6">
      {messages.map((message) => (
        <motion.article
          key={message.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex ${message.role === "user" ? "justify-end" : "items-end gap-3"}`}
        >
          {message.role !== "user" && (
            <div className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-blue-400 to-purple-500" />
          )}

          <div className={`flex max-w-[82%] flex-col gap-1 ${message.role === "user" ? "items-end" : "items-start"}`}>
            <span className="px-1 text-[12px] font-medium text-slate-400">
              {timeText(message.timestamp)}
            </span>
            {message.audioUrl ? (
              <div className="journey-liquid-glass flex min-w-[240px] flex-col gap-2 rounded-2xl p-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => new Audio(message.audioUrl).play().catch(() => {})}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500"
                    aria-label="播放原声"
                  >
                    <Play size={16} fill="currentColor" />
                  </button>
                  <div className="flex h-6 items-center gap-[3px]">
                    {WAVEFORM_HEIGHTS.map((height, index) => (
                      <span
                        key={index}
                        className="w-0.5 rounded-full bg-slate-500"
                        style={{ height: `${height}%` }}
                      />
                    ))}
                  </div>
                  <span className="text-[12px] font-medium text-slate-500">
                    {durationText(message.audioDurationSeconds)}
                  </span>
                </div>
                <p className="pl-1 text-[14px] leading-snug text-slate-600">
                  {message.content || "语音记录"}
                </p>
              </div>
            ) : (
              <div
                className={
                  message.role === "user"
                    ? "journey-liquid-glass max-w-full rounded-2xl px-4 py-3"
                    : "max-w-full px-1 py-1"
                }
              >
                <p className="whitespace-pre-wrap text-[15px] font-medium leading-relaxed text-slate-700">
                  {message.content || "正在整理..."}
                </p>
              </div>
            )}
            {message.kind === "note" && (
              <span className="flex items-center gap-1 px-1 text-[11px] font-medium text-slate-400">
                <BookOpenCheck size={12} />
                已记入 Pocket
              </span>
            )}
          </div>
        </motion.article>
      ))}

      {(isAssistantThinking || isComposingNote) && (
        <div className="journey-liquid-glass inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold text-slate-500">
          <Loader2 size={14} className="animate-spin" />
          {isComposingNote ? "正在为笔记匹配照片..." : "旅行助手正在整理..."}
        </div>
      )}

      <div className="journey-no-scrollbar flex gap-2 overflow-x-auto pb-2 pt-1">
        {DEMO_CHAT_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onAsk(prompt)}
            className="journey-glass-card shrink-0 rounded-full px-4 py-2 text-sm font-semibold text-slate-600"
          >
            {prompt}
          </button>
        ))}
        {DEMO_PIPELINE_INPUTS.slice(0, 3).map((sample) => (
          <button
            key={sample.label}
            onClick={() => onNote(sample.text)}
            className="journey-glass-card shrink-0 rounded-full px-4 py-2 text-sm font-semibold text-slate-700"
          >
            记：{sample.label}
          </button>
        ))}
      </div>
    </div>
  );
}
