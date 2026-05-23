"use client";

import { motion } from "framer-motion";
import { Play } from "lucide-react";
import type { Capsule } from "@/lib/journey-types";
import { STYLE_LABELS, type StyleKey } from "@/lib/journey-types";

interface JournalModeProps {
  capsules: Capsule[];
  journalText: string;
  activeStyle: StyleKey;
  isGenerating: boolean;
}

interface ScrapPhoto {
  url: string;
  title: string;
  location?: string | null;
}

const handFont = { fontFamily: '"Caveat", cursive' };
const journalFont = { fontFamily: '"Nanum Myeongjo", serif' };
const sceneRotations = ["rotate-[-1.5deg]", "rotate-[1.5deg]", "rotate-[-1deg]", "rotate-[2deg]"];

function allPhotos(capsules: Capsule[]) {
  return capsules.flatMap((capsule) =>
    (capsule.photoUrls ?? []).map((url) => ({
      url,
      title: capsule.title,
      location: capsule.location,
    }))
  );
}

function paragraphList(journalText: string) {
  return journalText
    .split("\n")
    .map((para) => para.trim())
    .filter(Boolean);
}

function monthLabel() {
  return new Date().toLocaleString("en-US", { month: "short" }).toUpperCase();
}

function dayLabel() {
  return new Date().toLocaleString("en-US", { day: "2-digit" });
}

function WashiTape({
  className,
  variant = "blue",
}: {
  className: string;
  variant?: "blue" | "dot" | "cream";
}) {
  const styleMap = {
    blue:
      "bg-[#9AB5C3]/60 [background-image:linear-gradient(90deg,rgba(255,255,255,.18)_50%,transparent_50%),linear-gradient(rgba(255,255,255,.18)_50%,transparent_50%)] [background-size:10px_10px]",
    dot:
      "bg-[#E6D5B8]/75 [background-image:radial-gradient(rgba(0,0,0,.12)_1px,transparent_1px)] [background-size:6px_6px]",
    cream:
      "bg-[#F0E9DD]/85 [background-image:linear-gradient(90deg,rgba(139,130,116,.12)_50%,transparent_50%)] [background-size:8px_8px]",
  };

  return (
    <div
      className={`pointer-events-none absolute z-20 h-6 shadow-sm mix-blend-multiply backdrop-blur-[1px] ${styleMap[variant]} ${className}`}
    />
  );
}

function Polaroid({
  photo,
  caption,
  className = "",
  dark = false,
  ratio = "aspect-square",
}: {
  photo?: ScrapPhoto | string;
  caption: string;
  className?: string;
  dark?: boolean;
  ratio?: string;
}) {
  const url = typeof photo === "string" ? photo : photo?.url;

  return (
    <motion.figure
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative min-w-0 shadow-[2px_4px_14px_rgba(41,35,28,0.14)] ${
        dark ? "border border-[#333] bg-[#171717] p-2 pb-5" : "bg-white p-2 pb-7"
      } ${className}`}
    >
      <WashiTape
        variant={dark ? "dot" : "cream"}
        className={`-top-3 left-1/2 w-14 -translate-x-1/2 ${dark ? "rotate-[8deg]" : "rotate-[-6deg]"}`}
      />
      <div className={`overflow-hidden ${ratio} bg-[#E0D8C9]`}>
        {url ? (
          <img
            src={url}
            alt=""
            className={`h-full w-full object-cover ${dark ? "contrast-125 sepia-[.22]" : "contrast-105 sepia-[.08]"}`}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-[#9B9284]">photo</div>
        )}
      </div>
      <figcaption
        className={`mt-2 truncate text-center text-[19px] leading-none ${
          dark ? "font-mono text-[#C0A062]" : "text-[#5F6B70]"
        }`}
        style={dark ? undefined : handFont}
      >
        {caption}
      </figcaption>
    </motion.figure>
  );
}

function LinedNote({ text, className = "" }: { text: string; className?: string }) {
  return (
    <div
      className={`rounded-sm bg-transparent px-1 text-[25px] leading-[31px] text-[#4E5354] ${className}`}
      style={{
        ...handFont,
        backgroundImage:
          "repeating-linear-gradient(transparent, transparent 30px, rgba(166,158,132,.48) 30px, rgba(166,158,132,.48) 31px)",
      }}
    >
      {text}
    </div>
  );
}

function AudioSticker({ className = "" }: { className?: string }) {
  const bars = [10, 16, 22, 12, 18, 8, 20, 14, 24, 12, 8, 18, 11, 21, 15, 9];

  return (
    <div
      className={`rounded-[16px] border border-[#E6E1D4] bg-[#FDFCF9] p-3 shadow-[2px_4px_12px_rgba(41,35,28,0.08)] ${className}`}
    >
      <div className="flex items-center gap-3">
        <button className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F0EDE4] text-[#8BA6B6]">
          <Play size={17} fill="currentColor" className="ml-0.5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="mb-1 truncate text-xs font-bold text-[#5E6265]">voice_memo_01.m4a</p>
          <div className="flex h-6 items-center gap-[3px]">
            {bars.map((height, index) => (
              <span
                key={index}
                className="w-1 rounded-full bg-[#8BA6B6]"
                style={{ height, opacity: 0.35 + (index % 5) * 0.13 }}
              />
            ))}
          </div>
        </div>
        <span className="text-[10px] text-[#A4A09A]">0:42</span>
      </div>
    </div>
  );
}

function Ticket({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={`relative border border-[#E3DCCB] bg-[#F0E9DD] px-4 py-2 text-center shadow-sm ${className}`}>
      <span className="absolute -left-1 top-1/2 h-4 w-2 -translate-y-1/2 rounded-r-full border-y border-r border-[#E3DCCB] bg-[#F6F4EF]" />
      <span className="absolute -right-1 top-1/2 h-4 w-2 -translate-y-1/2 rounded-l-full border-y border-l border-[#E3DCCB] bg-[#F6F4EF]" />
      <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.22em] text-[#888078]">{label}</p>
      <p className="truncate text-[21px] leading-none text-[#2C2B29]" style={handFont}>
        {value}
      </p>
    </div>
  );
}

function VideoCard({ photo }: { photo?: ScrapPhoto }) {
  return (
    <div className="relative min-w-0 rotate-[-1deg] bg-white p-1 shadow-[2px_4px_14px_rgba(41,35,28,0.14)]">
      <WashiTape variant="dot" className="-top-2 left-5 w-12 rotate-[14deg]" />
      <div className="relative aspect-[4/3] overflow-hidden bg-[#DED8CA]">
        {photo && <img src={photo.url} alt="" className="h-full w-full object-cover brightness-95" />}
        <div className="absolute inset-0 flex items-center justify-center bg-black/18">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/50 bg-white/30 text-white shadow-lg backdrop-blur-md">
            <Play size={21} fill="currentColor" className="ml-1" />
          </div>
        </div>
        <div className="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] tracking-wide text-white">
          02:15
        </div>
      </div>
    </div>
  );
}

function HeroScrapbook({
  coverPhotos,
  paragraphs,
  capsules,
  activeStyle,
  isGenerating,
}: {
  coverPhotos: ScrapPhoto[];
  paragraphs: string[];
  capsules: Capsule[];
  activeStyle: StyleKey;
  isGenerating: boolean;
}) {
  const heroText =
    paragraphs[0] ||
    capsules[0]?.aiContent ||
    capsules[0]?.userRawText ||
    "按住说话，把海风、脚步和当时的心情交给 FlowMemo。";
  const noteText = heroText.length > 118 ? `${heroText.slice(0, 115)}...` : heroText;
  const firstLocation = coverPhotos[0]?.location || capsules[0]?.location || "Travel";

  return (
    <section className="px-2 pt-3 text-[#2C2B29]" style={journalFont}>
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-12 w-12 rotate-[-5deg] flex-col items-center justify-center rounded-full border-2 border-[#8BA6B6] text-[#8BA6B6] opacity-80">
          <span className="mt-1 text-xs font-bold leading-none">{monthLabel()}</span>
          <span className="text-lg font-bold leading-none">{dayLabel()}</span>
        </div>
        <div className="min-w-0 flex-1 rotate-[1deg] text-[27px] leading-none text-[#576064]" style={handFont}>
          FlowMemo memories...
        </div>
      </div>

      <div className="relative rounded-[6px] border border-[#E5DFD0] bg-[#FBF8F0] p-3 shadow-[0_12px_30px_rgba(41,35,28,0.08)]">
        <WashiTape className="-top-3 right-[28%] w-20 rotate-[-3deg]" />
        <div className="grid grid-cols-[1fr_0.74fr] items-start gap-3">
          <Polaroid
            photo={coverPhotos[0]}
            caption={coverPhotos[0]?.location || "Today"}
            className="rotate-[-1.5deg]"
            ratio="aspect-[4/5]"
          />
          <div className="space-y-3">
            <Polaroid
              photo={coverPhotos[1] ?? coverPhotos[0]}
              caption="KODAK"
              className="rotate-[3deg]"
              dark
              ratio="aspect-square"
            />
            <Ticket label="Destination" value={String(firstLocation).slice(0, 14)} className="rotate-[-2deg]" />
          </div>
        </div>

        <LinedNote text={noteText} className="mt-5 rotate-[-0.5deg]" />

        <div className="mt-5 grid grid-cols-[0.9fr_1.1fr] items-start gap-3">
          <AudioSticker className="rotate-[1deg]" />
          <VideoCard photo={coverPhotos[2] ?? coverPhotos[0]} />
        </div>

        <div className="mt-5 flex items-center justify-between px-1 text-[10px] uppercase tracking-[0.24em] text-[#B4A99A]">
          <span>{STYLE_LABELS[activeStyle]?.label}</span>
          <span>{isGenerating ? "weaving" : "stitched"}</span>
        </div>
      </div>
    </section>
  );
}

function MemoryThread({
  paragraphs,
  isGenerating,
}: {
  paragraphs: string[];
  isGenerating: boolean;
}) {
  return (
    <section className="relative mt-10 px-3">
      <div className="mb-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-[#D7D0BE]" />
        <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#C69C8A]">
          Memory Thread
        </span>
        <span className="h-px flex-1 bg-[#D7D0BE]" />
      </div>

      {isGenerating && paragraphs.length === 0 ? (
        <div className="flex items-center gap-2 text-sm font-semibold text-[#C86B4A]">
          <span className="h-2 w-2 animate-ping rounded-full bg-[#C86B4A]" />
          正在把今天织成手账...
        </div>
      ) : (
        <div
          className="space-y-3 rounded-[4px] px-2 py-1 text-[24px] leading-[31px] text-[#505656]"
          style={{
            ...handFont,
            backgroundImage:
              "repeating-linear-gradient(transparent, transparent 30px, rgba(166,158,132,.45) 30px, rgba(166,158,132,.45) 31px)",
          }}
        >
          {(paragraphs.length ? paragraphs.slice(0, 3) : ["先记录一段旅途感受，照片和文字会自动在这里贴成手账。"]).map(
            (para, index) => (
              <p key={`${para}-${index}`} className="rotate-[-0.5deg]">
                {para}
              </p>
            )
          )}
        </div>
      )}
    </section>
  );
}

function SceneScrap({ capsule, index }: { capsule: Capsule; index: number }) {
  const photos = (capsule.photoUrls ?? []).slice(0, 4);
  const rotation = sceneRotations[index % sceneRotations.length];

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="relative mt-12 rounded-[6px] border border-[#E5DFD0] bg-[#FBF8F0] p-3 shadow-[0_10px_28px_rgba(41,35,28,0.07)]"
    >
      <div className="mb-4 flex items-center gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#A5A098]">
          Scene {String(index + 1).padStart(2, "0")}
        </span>
        <span className="h-px flex-1 bg-[#D7D0BE]" />
      </div>

      {photos.length > 0 ? (
        <div className="grid grid-cols-[1fr_0.58fr] items-start gap-3">
          <Polaroid
            photo={photos[0]}
            caption={capsule.location ?? "moment"}
            className={rotation}
            ratio="aspect-square"
          />
          <div className="space-y-3">
            {photos[1] && (
              <Polaroid
                photo={photos[1]}
                caption="detail"
                className="rotate-[3deg]"
                ratio="aspect-[3/4]"
              />
            )}
            {photos[2] && (
              <Polaroid
                photo={photos[2]}
                caption="film"
                className="rotate-[-2deg]"
                ratio="aspect-square"
                dark
              />
            )}
          </div>
        </div>
      ) : (
        <div className="flex aspect-[4/3] items-center justify-center rounded-sm border border-dashed border-[#D6CDBF] bg-[#F2EBDD] px-8 text-center text-sm leading-6 text-[#8B8174]">
          这段记忆暂时没有强相关照片，保留为留白卡片。
        </div>
      )}

      <div className="relative z-10 mt-5 rotate-[-0.5deg]">
        <WashiTape variant="dot" className="-top-3 left-4 w-12 rotate-[12deg]" />
        <LinedNote text={capsule.userRawText || capsule.aiContent || ""} />
      </div>

      <AudioSticker className="mt-5 rotate-[1deg]" />

      <p className="mt-5 px-1 text-[15px] leading-7 text-[#56514B]" style={journalFont}>
        {capsule.aiContent}
      </p>

      {capsule.keywords && capsule.keywords.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {capsule.keywords.slice(0, 5).map((keyword) => (
            <span
              key={keyword}
              className="rounded-sm border border-[#E3DCCB] bg-[#F0E9DD] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8C8176]"
            >
              {keyword}
            </span>
          ))}
        </div>
      )}
    </motion.section>
  );
}

export function JournalMode({ capsules, journalText, activeStyle, isGenerating }: JournalModeProps) {
  const photos = allPhotos(capsules);
  const coverPhotos = photos.slice(0, 4);
  const paragraphs = paragraphList(journalText);

  return (
    <div className="relative -mx-1 overflow-hidden bg-[#F6F4EF] pb-8 text-[#2C2B29]">
      <HeroScrapbook
        coverPhotos={coverPhotos}
        paragraphs={paragraphs}
        capsules={capsules}
        activeStyle={activeStyle}
        isGenerating={isGenerating}
      />
      <MemoryThread paragraphs={paragraphs} isGenerating={isGenerating} />
      <div className="px-2">
        {capsules.map((capsule, index) => (
          <SceneScrap key={capsule.id} capsule={capsule} index={index} />
        ))}
      </div>
      <div className="pb-4 pt-10 text-center">
        <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#B4A99A]">
          FlowMemo travel scrapbook
        </span>
      </div>
    </div>
  );
}
