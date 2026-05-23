"use client";

import { useEffect, useState } from "react";
import { History as HistoryIcon, Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { getJourneys } from "@/lib/api";
import type { Journey } from "@/lib/journey-types";
import { buildLocalHistoryJourneys, historyCoverPhotos } from "./history-utils";
import { HistoryFab } from "./history-fab";
import { HistoryJourneyCard } from "./history-journey-card";

const IS_LOCAL_RUNTIME = process.env.NEXT_PUBLIC_FLOWMEMO_RUNTIME === "local";

export function HistoryScreen() {
  const router = useRouter();
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const loadedJourneys = IS_LOCAL_RUNTIME
          ? buildLocalHistoryJourneys()
          : await getJourneys();
        if (!cancelled) setJourneys(loadedJourneys);
      } catch {
        if (!cancelled) setJourneys([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-svh bg-[#F3F5F8] text-[#0A112F]">
      <section className="relative mx-auto min-h-svh w-full max-w-[430px] overflow-hidden bg-white shadow-[0_18px_60px_rgba(15,23,42,0.10)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[300px] opacity-50 [background-image:linear-gradient(#E4E7EC_1px,transparent_1px),linear-gradient(90deg,#E4E7EC_1px,transparent_1px)] [background-position:center_top] [background-size:40px_40px] [mask-image:linear-gradient(to_bottom,black_0%,transparent_100%)]"
        />

        <header className="relative z-10 flex items-center justify-between px-6 pb-6 pt-12">
          <button
            type="button"
            onClick={() => router.push("/?start=1")}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E4E7EC] bg-white text-[#667085] shadow-sm"
            aria-label="返回"
          >
            <HistoryIcon size={18} />
          </button>
          <h1 className="flex-1 px-4 text-[32px] font-bold leading-none tracking-normal">
            历史旅程
          </h1>
          <Sparkles size={18} className="shrink-0 text-[#0A112F]/60" />
        </header>

        {isLoading ? (
          <div className="relative z-10 flex h-64 items-center justify-center text-[#667085]">
            <Loader2 size={22} className="animate-spin" />
          </div>
        ) : journeys.length > 0 ? (
          <div className="relative z-10 grid grid-cols-2 gap-x-4 gap-y-6 px-5 pb-36">
            {journeys.map((journey, index) => (
              <HistoryJourneyCard
                key={journey.id}
                journey={journey}
                coverPhotos={historyCoverPhotos(journey, index)}
              />
            ))}
            <div className="h-40" aria-hidden="true" />
          </div>
        ) : (
          <div className="relative z-10 mx-5 mt-8 rounded-2xl border border-[#E4E7EC] bg-[#F9FAFB] px-5 py-8 text-center">
            <p className="text-base font-semibold">还没有历史旅程</p>
            <p className="mt-2 text-sm leading-6 text-[#667085]">
              新建一次旅程后，Conch 会把它收进这里，方便之后回看。
            </p>
          </div>
        )}

        <HistoryFab />
      </section>
    </main>
  );
}
