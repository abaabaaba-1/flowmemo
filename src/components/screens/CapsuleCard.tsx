"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Mic, Check } from "lucide-react";
import type { Capsule } from "@/lib/journey-types";
import { STYLE_LABELS } from "@/lib/journey-types";
import type { StyleKey } from "@/lib/journey-types";
import { rewriteCapsuleContent } from "@/lib/api";
import { useState } from "react";

interface CapsuleCardProps {
  capsule: Capsule;
  onStyleChange?: (capsuleId: string, style: StyleKey, newContent: string) => void;
  isNew?: boolean;
  demoMode?: boolean;
}

export function CapsuleCard({ capsule, onStyleChange, isNew, demoMode = false }: CapsuleCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [activeStyle, setActiveStyle] = useState<StyleKey>(
    (capsule.aiContentStyle as StyleKey) ?? "cinematic"
  );
  const [isChangingStyle, setIsChangingStyle] = useState(false);
  const [displayContent, setDisplayContent] = useState(capsule.aiContent ?? "");

  async function handleStyleSelect(style: StyleKey) {
    if (style === activeStyle || isChangingStyle) return;
    setIsChangingStyle(true);
    setIsFlipped(false);

    try {
      const accumulated = await rewriteCapsuleContent({
        existingContent: capsule.aiContent,
        style,
        demoMode,
        onChunk: setDisplayContent,
      });

      setActiveStyle(style);
      onStyleChange?.(capsule.id, style, accumulated);
    } catch {
      // silent
    } finally {
      setIsChangingStyle(false);
    }
  }

  const time = new Date(capsule.capturedAt).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <motion.article
      initial={isNew ? { opacity: 0, scale: 0.85, y: 20, rotate: 3 } : { opacity: 1 }}
      animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
      transition={isNew ? { duration: 0.5, type: "spring", stiffness: 200, damping: 18 } : {}}
      className="bg-[#121216] border border-[#1E1E24] rounded-xl overflow-hidden relative hover:border-[#E99A3F]/30 transition-colors"
    >
      {/* Top accent */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-[#E99A3F]/60 via-transparent to-transparent" />

      {/* Cinema-style photo strip */}
      {capsule.photoUrls && capsule.photoUrls.length > 0 ? (
        <div className="w-full aspect-[21/9] bg-black relative overflow-hidden border-b border-[#1E1E24]">
          <img
            src={capsule.photoUrls[0]}
            alt=""
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 flex justify-between items-end">
            <span className="text-[10px] bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded border border-white/10 text-[#9E9EAF]">
              {capsule.location ?? "未知地点"}
            </span>
            <span className="font-mono text-[9px] text-[#494954]">
              {capsule.photoCount} 张 · Conch
            </span>
          </div>
          {/* Film notches */}
          <div className="absolute inset-y-0 left-1.5 flex flex-col justify-between py-1 opacity-20">
            {[0, 1, 2].map((i) => <div key={i} className="w-1 h-1.5 bg-white rounded-sm" />)}
          </div>
          <div className="absolute inset-y-0 right-1.5 flex flex-col justify-between py-1 opacity-20">
            {[0, 1, 2].map((i) => <div key={i} className="w-1 h-1.5 bg-white rounded-sm" />)}
          </div>
        </div>
      ) : (
        <div className="w-full aspect-[21/9] bg-black relative overflow-hidden border-b border-[#1E1E24] bg-[radial-gradient(ellipse_at_center,rgba(233,154,63,0.1),transparent_70%)]">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-[#494954] font-mono text-xs tracking-widest">NO PHOTO · MEMORY ONLY</div>
          </div>
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
            <span className="text-[10px] text-[#9E9EAF]">{capsule.location ?? "未知地点"}</span>
          </div>
        </div>
      )}

      {/* Card body */}
      <div className="p-4 space-y-3">
        {/* User raw text */}
        {capsule.userRawText && (
          <div className="flex items-start gap-2 py-2 px-2.5 bg-black/40 rounded-lg border border-[#1E1E24]">
            <Mic size={12} className="flex-shrink-0 mt-0.5 text-[#E99A3F]" />
            <span className="text-[11px] text-[#9E9EAF] italic leading-relaxed font-light">
              &ldquo;{capsule.userRawText}&rdquo;
            </span>
          </div>
        )}

        {/* AI content */}
        <div className="space-y-1.5">
          <h4 className="text-sm font-semibold tracking-wide text-[#F5F5F7]">{capsule.title}</h4>
          <p
            className="text-xs text-[#9E9EAF] leading-relaxed italic"
            style={{ fontFamily: '"Instrument Serif", serif' }}
          >
            {isChangingStyle ? (
              <span className="text-[#E99A3F]/60">
                {displayContent || "改写中..."}
              </span>
            ) : (
              <>&ldquo;{displayContent || capsule.aiContent}&rdquo;</>
            )}
          </p>
        </div>

        {/* Tags + time */}
        <div className="flex justify-between items-center text-[10px]">
          <div className="flex gap-1.5 flex-wrap">
            {(capsule.keywords ?? []).slice(0, 3).map((kw) => (
              <span
                key={kw}
                className="text-[#E99A3F] bg-[#E99A3F]/10 px-2 py-0.5 rounded-full border border-[#E99A3F]/20"
              >
                {kw}
              </span>
            ))}
          </div>
          <span className="text-[#494954] font-mono">{time}</span>
        </div>

        {/* Style switcher */}
        <div className="pt-2 border-t border-[#1E1E24]">
          <button
            onClick={() => setIsFlipped(!isFlipped)}
            className="text-[10px] text-[#494954] hover:text-[#9E9EAF] transition-colors flex items-center gap-1 mb-2"
          >
            <span>切换风格</span>
            <motion.span
              animate={{ rotate: isFlipped ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              ▾
            </motion.span>
          </button>

          <AnimatePresence>
            {isFlipped && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap gap-1.5 pb-1">
                  {(Object.entries(STYLE_LABELS) as [StyleKey, { label: string; desc: string }][]).map(
                    ([key, { label }]) => (
                      <button
                        key={key}
                        onClick={() => handleStyleSelect(key)}
                        disabled={isChangingStyle}
                        className={`text-[10px] px-2.5 py-1 rounded-full border transition-all flex items-center gap-1 ${
                          activeStyle === key
                            ? "border-[#E99A3F] bg-[#E99A3F]/10 text-[#E99A3F]"
                            : "border-[#1E1E24] bg-white/5 text-[#9E9EAF] hover:border-[#494954]"
                        } disabled:opacity-40`}
                      >
                        {activeStyle === key && <Check size={8} />}
                        {label}
                      </button>
                    )
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.article>
  );
}
