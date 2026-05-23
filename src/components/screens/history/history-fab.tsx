"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

export function HistoryFab() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  function startNewJourney() {
    setIsOpen(false);
    router.push("/?start=1");
  }

  return (
    <div className="fixed bottom-[88px] right-6 z-30 h-[168px] w-44 pointer-events-none sm:right-[calc((100vw-430px)/2+24px)]">
      <div
        className={[
          "absolute bottom-[88px] right-0 flex flex-col items-end gap-2.5 transition-all",
          isOpen ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-[0.98] opacity-0",
        ].join(" ")}
      >
        <button
          type="button"
          onClick={startNewJourney}
          className="pointer-events-auto h-[42px] min-w-[132px] rounded-[14px] border border-white/45 bg-white/80 px-4 text-[13px] font-semibold tracking-normal text-[#0A112F] shadow-[0_10px_24px_rgba(10,17,47,0.12)] backdrop-blur-2xl active:scale-[0.98]"
        >
          添加旅程
        </button>
        <button
          type="button"
          onClick={startNewJourney}
          className="pointer-events-auto h-[42px] min-w-[132px] rounded-[14px] border border-white/45 bg-white/80 px-4 text-[13px] font-semibold tracking-normal text-[#0A112F] shadow-[0_10px_24px_rgba(10,17,47,0.12)] backdrop-blur-2xl active:scale-[0.98]"
        >
          上传行程图片
        </button>
      </div>

      <button
        type="button"
        aria-label="添加新旅程"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((value) => !value)}
        className="pointer-events-auto absolute bottom-0 right-0 flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-full border border-white/35 bg-white/70 text-[#0A112F] shadow-[inset_0_1px_12px_rgba(255,255,255,0.75),0_12px_28px_rgba(10,17,47,0.12)] backdrop-blur-2xl active:scale-95"
      >
        <Plus size={32} strokeWidth={2.5} className={`transition-transform ${isOpen ? "-rotate-45" : ""}`} />
      </button>
    </div>
  );
}
