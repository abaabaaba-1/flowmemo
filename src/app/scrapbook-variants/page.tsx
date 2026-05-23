"use client";

import { ExportCanvas, EXPORT_CANVAS_VARIANTS } from "@/components/screens/ExportCanvas";
import { DEMO_CAPSULES, DEMO_JOURNAL_TEXT, DEMO_JOURNEY } from "@/lib/demo-data";
import type { Capsule, Journey } from "@/lib/journey-types";

export default function ScrapbookVariantsPage() {
  const capsules = DEMO_CAPSULES as unknown as Capsule[];
  const journey = DEMO_JOURNEY as unknown as Journey;

  return (
    <main className="min-h-svh bg-[#EDE4D5] px-6 py-8 text-[#2F2924]">
      <div className="mx-auto max-w-[1280px]">
        <header className="mb-8">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#C86B4A]">Conch</p>
          <h1 className="mt-3 text-3xl font-black tracking-normal">手账导出视觉候选</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#7E7368]">
            这三版都避开黑色电影海报，改成暖色纸张、旅行本和轻杂志方向。
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-3">
          {EXPORT_CANVAS_VARIANTS.map(({ key, label }) => (
            <section key={key} className="min-w-0">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-black">{label}</h2>
                <span className="rounded-full border border-[#D9CCB8] bg-[#FFF9EF] px-3 py-1 text-xs font-bold text-[#8B8174]">
                  {key}
                </span>
              </div>
              <div data-testid={`scrapbook-variant-${key}`} className="inline-block overflow-hidden rounded-[10px] shadow-2xl">
                <ExportCanvas
                  journey={journey}
                  capsules={capsules}
                  journalText={DEMO_JOURNAL_TEXT.healing}
                  activeStyle="healing"
                  authorName="旅人"
                  variant={key}
                  travelDate="2026-11-08"
                />
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
