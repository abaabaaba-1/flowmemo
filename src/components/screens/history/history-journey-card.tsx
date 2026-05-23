import Link from "next/link";
import type { Journey } from "@/lib/journey-types";
import { formatHistoryDate } from "./history-utils";

interface HistoryJourneyCardProps {
  journey: Journey;
  coverPhotos: string[];
}

export function HistoryJourneyCard({ journey, coverPhotos }: HistoryJourneyCardProps) {
  const [firstPhoto, secondPhoto] = coverPhotos;

  return (
    <Link
      href={`/journey/${journey.id}`}
      className="group flex min-w-0 flex-col text-[#0A112F] no-underline transition-transform active:scale-[0.985]"
    >
      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-[#E4E7EC] bg-[#F9FAFB]">
        <div className="relative h-[122px] w-[106px]">
          <div className="absolute left-0 top-0 z-10 h-24 w-[74px] translate-x-[3px] translate-y-3 -rotate-2 overflow-hidden border border-black/5 bg-white p-1.5 pb-[18px] opacity-55 shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
            <div
              className="h-full w-full bg-cover bg-center"
              style={{ backgroundImage: `url("${firstPhoto}")` }}
              aria-hidden="true"
            />
          </div>
          <div className="absolute left-0 top-0 z-20 h-24 w-[74px] translate-x-[43px] translate-y-[18px] rotate-[15deg] overflow-hidden border border-black/5 bg-white p-1.5 pb-[18px] opacity-75 shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-transform group-active:translate-x-[43px] group-active:translate-y-[18px] group-active:rotate-[18deg] group-active:scale-[1.03]">
            <div
              className="h-full w-full bg-cover bg-center"
              style={{ backgroundImage: `url("${secondPhoto}")` }}
              aria-hidden="true"
            />
          </div>
        </div>
      </div>
      <div className="mt-3 min-w-0">
        <div className="truncate text-[16px] font-semibold leading-tight tracking-normal">
          {journey.destination || "未命名旅程"}
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.05em] text-[#667085]">
          <span>{formatHistoryDate(journey.startDate)}</span>
        </div>
      </div>
    </Link>
  );
}
