"use client";

import { motion } from "framer-motion";
import type { Capsule } from "@/lib/journey-types";

interface VlogModeProps {
  capsules: Capsule[];
  journeyDestination: string;
}

export function VlogMode({ capsules, journeyDestination }: VlogModeProps) {
  const displayCapsules = capsules.length > 0 ? capsules : [
    {
      id: "placeholder",
      title: journeyDestination,
      location: "",
      aiContent: "旅途中的美丽瞬间，正在被 AI 导演记录下来。",
      userRawText: "",
      keywords: [],
      photoUrls: [],
      photoCount: 0,
      capturedAt: new Date(),
    } as unknown as Capsule,
  ];

  return (
    <div className="space-y-6">
      <p className="text-[10px] text-center text-[#9E9EAF] italic font-light">
        向右滑动，翻阅一部只属于你的宽屏微电影手记...
      </p>

      {/* Horizontal film strip */}
      <div className="flex gap-4 overflow-x-auto snap-x pb-6 pt-2" style={{ scrollbarWidth: "none" }}>
        {displayCapsules.map((capsule, idx) => (
          <motion.article
            key={capsule.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="flex-shrink-0 w-[280px] snap-center bg-black border border-[#1E1E24] rounded-xl overflow-hidden relative shadow-2xl"
          >
            {/* Main image area */}
            <div className="aspect-[16/9] relative">
              {capsule.photoUrls?.[0] ? (
                <>
                  <img
                    src={capsule.photoUrls[0]}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/30" />
                </>
              ) : (
                <div className="w-full h-full bg-[radial-gradient(ellipse_at_center,rgba(233,154,63,0.1),transparent_70%)] flex items-center justify-center">
                  <span className="font-mono text-[9px] text-[#494954] tracking-widest">NO PHOTO</span>
                </div>
              )}

              {/* Subtitle overlay */}
              <div className="absolute bottom-2 inset-x-3 bg-black/70 backdrop-blur-md border border-white/5 p-2.5 rounded-lg">
                <span className="text-[9px] font-mono text-[#E99A3F] uppercase tracking-widest block mb-0.5">
                  SCENE {String(idx + 1).padStart(2, "0")} · {capsule.location ?? "途中"}
                </span>
                <p className="text-[11px] text-white leading-relaxed font-light">
                  &ldquo;{capsule.aiContent?.slice(0, 60) ?? capsule.userRawText?.slice(0, 60) ?? capsule.title}...&rdquo;
                </p>
              </div>

              {/* Camera metadata */}
              <div className="absolute top-2 left-2 text-[8px] font-mono text-white/30">
                Conch · {new Date(capsule.capturedAt).toLocaleDateString("zh-CN")}
              </div>
            </div>

            {/* Card bottom */}
            <div className="p-3 space-y-2">
              <h4
                className="text-sm font-medium text-[#F5F5F7] italic"
                style={{ fontFamily: '"Instrument Serif", serif' }}
              >
                {capsule.title}
              </h4>
              <div className="flex gap-1.5 flex-wrap">
                {(capsule.keywords ?? []).slice(0, 3).map((kw) => (
                  <span key={kw} className="text-[9px] px-1.5 py-0.5 rounded bg-[#E99A3F]/10 text-[#E99A3F]">
                    {kw}
                  </span>
                ))}
              </div>

              {/* Multiple photos indicator */}
              {capsule.photoUrls && capsule.photoUrls.length > 1 && (
                <div className="flex gap-1 mt-1">
                  {capsule.photoUrls.slice(0, 5).map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt=""
                      className="w-8 h-8 object-cover rounded border border-[#1E1E24] opacity-60 hover:opacity-100 transition-opacity"
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.article>
        ))}
      </div>

      {/* Filmstrip indicator dots */}
      <div className="flex justify-center gap-1.5">
        {displayCapsules.map((_, i) => (
          <div
            key={i}
            className="w-1 h-1 rounded-full bg-[#494954]"
          />
        ))}
      </div>
    </div>
  );
}
