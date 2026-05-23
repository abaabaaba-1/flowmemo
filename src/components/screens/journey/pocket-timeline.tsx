"use client";

import { useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { Camera, Check, ImagePlus, Loader2, Play, Sparkles, Video } from "lucide-react";
import type { Capsule, Journey } from "@/lib/journey-types";
import type { PhotoAsset } from "./journey-utils";
import { buildPocketEvents, durationText, timeText } from "./journey-utils";

interface PocketTimelineProps {
  journey: Journey | null;
  capsules: Capsule[];
  photoPool: PhotoAsset[];
  selectedPhotoUrls: Set<string>;
  newCapsuleIds: Set<string>;
  isComposingNote: boolean;
  isAnalyzingPhotos: boolean;
  onImportPhotos: (files: File[]) => void;
  onTogglePhotoSelection: (url: string) => void;
  onOpenCanvas: () => void;
}

const WAVEFORM_HEIGHTS = [40, 60, 30, 80, 50, 70, 40, 90, 60, 30, 50, 70, 40, 30];

export function PocketTimeline({
  journey,
  capsules,
  photoPool,
  selectedPhotoUrls,
  newCapsuleIds,
  isComposingNote,
  isAnalyzingPhotos,
  onImportPhotos,
  onTogglePhotoSelection,
  onOpenCanvas,
}: PocketTimelineProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const events = useMemo(() => buildPocketEvents(capsules), [capsules]);
  const photosByUrl = useMemo(() => new Map(photoPool.map((photo) => [photo.url, photo])), [photoPool]);
  const analyzedPhotoCount = photoPool.filter((photo) => photo.analysisStatus === "ready" || photo.aiAnalysis).length;

  return (
    <div className="relative min-h-full pb-6">
      <div className="absolute bottom-0 left-8 top-0 w-px bg-black/[0.05]" />

      <div className="mb-6 flex items-start justify-between gap-4 px-8">
        <div className="ml-6 min-w-0">
          <h2 className="truncate text-[15px] font-semibold text-slate-700">
            今日 Pocket · {journey?.destination ?? "旅途中"}
          </h2>
          <p className="mt-1 text-[12px] font-medium text-slate-400">
            {events.length} 个事件
            {analyzedPhotoCount > 0 ? ` · AI ${analyzedPhotoCount}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {capsules.length > 0 && (
            <button
              onClick={onOpenCanvas}
              className="journey-liquid-glass flex h-11 w-11 items-center justify-center rounded-full text-slate-500"
              aria-label="生成今日手账"
            >
              <Sparkles size={18} />
            </button>
          )}
          <button
            onClick={() => fileRef.current?.click()}
            className="journey-liquid-glass flex h-11 w-11 items-center justify-center rounded-full text-slate-500"
            aria-label="导入相册照片或视频"
          >
            <ImagePlus size={20} />
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.currentTarget.value = "";
            onImportPhotos(files);
          }}
        />
      </div>

      {photoPool.length > 0 && (
        <section className="journey-liquid-glass mx-8 mb-6 ml-14 rounded-2xl px-3 py-2.5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-slate-700">Photo Pool</p>
              <p className="truncate text-[11px] text-slate-400">
                点选照片，下一条记录会优先关联
              </p>
            </div>
            {selectedPhotoUrls.size > 0 && (
              <span className="journey-glass-card rounded-full px-3 py-1 text-[11px] font-semibold text-slate-600">
                {selectedPhotoUrls.size}
              </span>
            )}
          </div>
          <div className="journey-no-scrollbar flex gap-2 overflow-x-auto pb-1">
            {photoPool.map((photo) => {
              const selected = selectedPhotoUrls.has(photo.url);
              return (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => onTogglePhotoSelection(photo.url)}
                  className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 bg-slate-200 shadow-sm ${
                    selected ? "border-slate-800" : "border-white"
                  }`}
                  aria-label={`关联照片：${photo.label}`}
                >
                  <img src={photo.url} alt="" className="h-full w-full object-cover" />
                  {selected && (
                    <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white">
                      <Check size={14} />
                    </span>
                  )}
                  {(photo.aiAnalysis || photo.analysisStatus === "ready") && (
                    <span className="journey-glass-card absolute bottom-1 left-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold text-slate-700">
                      AI
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {events.length === 0 ? (
        <div className="journey-liquid-glass mx-8 ml-14 rounded-[28px] p-6 text-center">
          <Camera className="mx-auto mb-4 text-slate-400" />
          <p className="text-base font-semibold text-slate-700">Pocket 还是空的</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            在 Chat 里说一句现场感受，或先导入照片/视频，事件会自动落到这里。
          </p>
        </div>
      ) : (
        <div>
          {events.map((event) => {
            const firstPhoto = event.photoUrls[0];
            const firstVideo = event.videoUrls[0];
            const matchedPhotos = event.photoUrls
              .map((url) => photosByUrl.get(url))
              .filter(Boolean) as PhotoAsset[];
            const isNew = newCapsuleIds.has(event.capsuleId);

            return (
              <motion.article
                key={event.id}
                initial={isNew ? { opacity: 0, y: 16, scale: 0.97 } : false}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="relative mb-10 px-8"
              >
                <div className="absolute left-[30px] top-2 h-1.5 w-1.5 rounded-full bg-slate-300" />
                <div className="ml-6">
                  <div className="mb-2 text-[13px] font-medium uppercase tracking-wide text-slate-400">
                    {event.type === "audio" ? "Voice" : timeText(event.timestamp)}
                  </div>

                  {event.type === "text" && (
                    <p className="max-w-[85%] text-[15px] leading-relaxed text-slate-700">
                      {event.text}
                    </p>
                  )}

                  {event.type === "audio" && (
                    <div className="journey-liquid-glass inline-flex min-w-[220px] items-center gap-3 rounded-2xl p-3">
                      <button
                        onClick={() => event.audioUrl && new Audio(event.audioUrl).play().catch(() => {})}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500"
                        aria-label="播放语音"
                      >
                        <Play size={18} fill="currentColor" />
                      </button>
                      <div>
                        <div className="flex h-6 items-center gap-0.5">
                          {WAVEFORM_HEIGHTS.map((height, index) => (
                            <span
                              key={index}
                              className="w-0.5 rounded-full bg-slate-500"
                              style={{ height: `${height}%` }}
                            />
                          ))}
                        </div>
                        {event.transcript && (
                          <p className="mt-2 max-w-[210px] text-[13px] leading-snug text-slate-600">
                            {event.transcript}
                          </p>
                        )}
                      </div>
                      <span className="ml-1 text-[12px] font-medium text-slate-500">
                        {durationText(event.audioDurationSeconds)}
                      </span>
                    </div>
                  )}

                  {event.type === "photo" && (
                    <div>
                      <div className="relative h-28 w-44">
                        <div className="absolute inset-0 translate-x-4 rotate-6 rounded-xl border-2 border-white bg-slate-200 shadow-md" />
                        <div className="absolute inset-0 translate-x-2 rotate-3 rounded-xl border-2 border-white bg-slate-200 shadow-md" />
                        <div className="absolute inset-0 overflow-hidden rounded-xl border-2 border-white bg-slate-200 shadow-md">
                          {firstPhoto && <img src={firstPhoto} alt="" className="h-full w-full object-cover" />}
                          <div className="journey-glass-card absolute bottom-2 right-2 rounded-full px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                            {event.photoUrls.length}
                          </div>
                        </div>
                      </div>
                      {event.text && (
                        <p className="mt-3 max-w-[85%] text-[14px] leading-relaxed text-slate-600">
                          {event.text}
                        </p>
                      )}
                      {matchedPhotos.length > 0 && (
                        <p className="mt-3 text-[11px] font-medium text-slate-400">
                          matched: {matchedPhotos.map((photo) => photo.label).join(" / ")}
                        </p>
                      )}
                    </div>
                  )}

                  {event.type === "video" && (
                    <div>
                      <div className="relative h-28 w-44">
                        <div className="absolute inset-0 translate-x-4 rotate-6 rounded-xl border-2 border-white bg-slate-200 shadow-md" />
                        <div className="absolute inset-0 overflow-hidden rounded-xl border-2 border-white bg-slate-200 shadow-md">
                          {firstVideo ? (
                            <video src={firstVideo} className="h-full w-full object-cover" muted playsInline />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-slate-400">
                              <Video size={22} />
                            </div>
                          )}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/40 text-white backdrop-blur-sm">
                              <Play size={15} fill="currentColor" />
                            </span>
                          </div>
                          <div className="journey-glass-card absolute bottom-2 right-2 rounded-full px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                            {event.videoUrls.length}
                          </div>
                        </div>
                      </div>
                      {event.text && (
                        <p className="mt-3 max-w-[85%] text-[14px] leading-relaxed text-slate-600">
                          {event.text}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </motion.article>
            );
          })}
        </div>
      )}

      {(isComposingNote || isAnalyzingPhotos) && (
        <div className="journey-liquid-glass mx-8 ml-14 mt-6 inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-slate-500">
          <Loader2 size={15} className="animate-spin" />
          {isAnalyzingPhotos ? "AI 正在识别素材..." : "正在编排 Pocket..."}
        </div>
      )}

    </div>
  );
}
