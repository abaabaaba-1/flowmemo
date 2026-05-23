"use client";

import { forwardRef } from "react";
import type { CSSProperties } from "react";
import type { Capsule, Journey, StyleKey } from "@/lib/journey-types";
import { STYLE_LABELS } from "@/lib/journey-types";
import { dateKeyToDate } from "@/lib/journey-date";
import { DEMO_CAPSULES, DEMO_JOURNEY } from "@/lib/demo-data";

export type ExportCanvasVariant = "paper" | "aqua" | "editorial";

export const EXPORT_CANVAS_VARIANTS: { key: ExportCanvasVariant; label: string }[] = [
  { key: "paper", label: "复古拼贴" },
  { key: "aqua", label: "蓝白旅行本" },
  { key: "editorial", label: "杂志手帐" },
];

interface ExportCanvasProps {
  journey: Journey | null;
  capsules: Capsule[];
  journalText: string;
  activeStyle: StyleKey;
  authorName?: string;
  variant?: ExportCanvasVariant;
  travelDate?: string;
}

type ExportCanvasVariantProps = Omit<ExportCanvasProps, "variant"> & {
  authorName: string;
  travelDate: string;
};

type Photo = {
  url: string;
  title: string;
  location?: string | null;
};

type Colors = {
  page: string;
  surface: string;
  ink: string;
  muted: string;
  line: string;
  accent: string;
  accentSoft: string;
  blue: string;
};

const palette: Record<ExportCanvasVariant, Colors> = {
  paper: {
    page: "#F8F4EC",
    surface: "#FFFDF7",
    ink: "#2E302C",
    muted: "#7A746B",
    line: "#DAD0BD",
    accent: "#C86B4A",
    accentSoft: "#F0D9C8",
    blue: "#93B0BA",
  },
  aqua: {
    page: "#F4F8F6",
    surface: "#FFFFFA",
    ink: "#25363B",
    muted: "#6E7D7F",
    line: "#D4E1DD",
    accent: "#407F8F",
    accentSoft: "#D8ECEE",
    blue: "#85B8C5",
  },
  editorial: {
    page: "#F5EFE3",
    surface: "#FEFCF6",
    ink: "#2C2822",
    muted: "#756B5E",
    line: "#D9CDB8",
    accent: "#9F6B43",
    accentSoft: "#EAD8C5",
    blue: "#93A8AA",
  },
};

function allPhotos(capsules: Capsule[]) {
  return capsules.flatMap((capsule) =>
    (capsule.photoUrls ?? []).map((url) => ({
      url,
      title: capsule.title,
      location: capsule.location,
    }))
  );
}

function textLines(text: string, fallback: string) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.length ? lines : [fallback];
}

function clip(value: string | null | undefined, length: number) {
  const text = String(value ?? "");
  return text.length > length ? `${text.slice(0, length)}...` : text;
}

function looksMojibake(value: string | null | undefined) {
  const text = String(value ?? "");
  if (!text) return false;
  if (text.includes("�")) return true;
  const suspicious = text.match(/[锛銆鏃绱犳潗鎵嬬处鐢诲嵎涓滀含淇杽绔规灄]/g)?.length ?? 0;
  return suspicious >= Math.max(4, Math.floor(text.length * 0.08));
}

function cleanScrapbookTitle(value: string | null | undefined, fallback = "Travel Log") {
  const cleaned = String(value ?? fallback)
    .replace(/^(FlowMemo|Conch)\s*/i, "")
    .replace(/\s+/g, "")
    .trim();
  return clip(cleaned || fallback, 8);
}

function displayDate(travelDate: string) {
  return travelDate ? dateKeyToDate(travelDate) : new Date();
}

function monthShort(travelDate: string) {
  return displayDate(travelDate).toLocaleString("en-US", { month: "short" }).toUpperCase();
}

function dayNumber(travelDate: string) {
  return displayDate(travelDate).toLocaleString("en-US", { day: "2-digit" });
}

function monthDay(travelDate: string) {
  return displayDate(travelDate).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
}

function fullDate(travelDate: string) {
  return displayDate(travelDate).toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" });
}

function CanvasShell({ colors, children }: { colors: Colors; children: React.ReactNode }) {
  return (
    <div
      style={{
        width: "375px",
        minHeight: "720px",
        background: colors.page,
        color: colors.ink,
        fontFamily: "Inter, system-ui, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

function Tape({
  colors,
  style,
  variant = "blue",
}: {
  colors: Colors;
  style?: CSSProperties;
  variant?: "blue" | "cream" | "dot";
}) {
  const background =
    variant === "blue"
      ? colors.blue
      : variant === "dot"
        ? "#E6D6BC"
        : colors.accentSoft;

  return (
    <div
      style={{
        position: "absolute",
        width: "62px",
        height: "20px",
        background,
        opacity: 0.62,
        boxShadow: "0 2px 5px rgba(73,55,35,0.08)",
        backgroundImage:
          variant === "dot"
            ? "radial-gradient(rgba(0,0,0,.13) 1px, transparent 1px)"
            : "linear-gradient(90deg, rgba(255,255,255,.18) 50%, transparent 50%), linear-gradient(rgba(255,255,255,.16) 50%, transparent 50%)",
        backgroundSize: variant === "dot" ? "6px 6px" : "10px 10px",
        ...style,
      }}
    />
  );
}

function Polaroid({
  photo,
  caption,
  colors,
  rotate = "-1deg",
  ratio = "1 / 1",
  dark = false,
  tapeVariant = "blue",
  style,
}: {
  photo?: Photo;
  caption: string;
  colors: Colors;
  rotate?: string;
  ratio?: string;
  dark?: boolean;
  tapeVariant?: "blue" | "cream" | "dot";
  style?: CSSProperties;
}) {
  return (
    <figure
      style={{
        margin: 0,
        padding: dark ? "7px 7px 18px" : "8px 8px 24px",
        background: dark ? "#24201D" : "#FFFFFF",
        border: dark ? "1px solid #3A332D" : `1px solid ${colors.line}`,
        boxShadow: "0 9px 20px rgba(49,37,25,0.13)",
        transform: `rotate(${rotate})`,
        position: "relative",
        ...style,
      }}
    >
      <Tape
        colors={colors}
        variant={dark ? "dot" : tapeVariant}
        style={{ left: "50%", top: "-10px", transform: "translateX(-50%) rotate(3deg)" }}
      />
      <div style={{ aspectRatio: ratio, overflow: "hidden", background: colors.accentSoft }}>
        {photo ? (
          <img
            src={photo.url}
            alt=""
            crossOrigin="anonymous"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              filter: dark ? "contrast(1.08) saturate(.9)" : "contrast(1.02) saturate(.96)",
            }}
          />
        ) : (
          <div style={{ height: "100%", display: "grid", placeItems: "center", color: colors.muted, fontSize: "11px" }}>
            photo
          </div>
        )}
      </div>
      <figcaption
        style={{
          marginTop: "8px",
          textAlign: "center",
          color: dark ? "#E8D7B8" : colors.muted,
          fontFamily: '"Caveat", cursive',
          fontSize: dark ? "16px" : "18px",
          lineHeight: 1,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {caption}
      </figcaption>
    </figure>
  );
}

function AudioPill({ colors, style }: { colors: Colors; style?: CSSProperties }) {
  const bars = [9, 15, 20, 12, 17, 8, 22, 13, 18, 10, 15, 21, 12, 16];
  return (
    <div
      style={{
        borderRadius: "17px",
        border: `1px solid ${colors.line}`,
        background: "rgba(255,255,250,.9)",
        padding: "11px 13px",
        boxShadow: "0 8px 18px rgba(49,37,25,.08)",
        ...style,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div
          style={{
            width: "38px",
            height: "38px",
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            background: "#F0EDE5",
            color: colors.blue,
            fontSize: "14px",
            paddingLeft: "2px",
          }}
        >
          ▶
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: "0 0 2px", color: "#4F5960", fontSize: "12px", fontWeight: 800 }}>
            Waves_recording_01.m4a
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "3px", height: "22px" }}>
            {bars.map((height, index) => (
              <span
                key={index}
                style={{
                  width: "3px",
                  height,
                  borderRadius: "10px",
                  background: colors.blue,
                  opacity: 0.35 + (index % 4) * 0.12,
                }}
              />
            ))}
          </div>
        </div>
        <span style={{ color: "#9B958E", fontSize: "10px" }}>0:42</span>
      </div>
    </div>
  );
}

function LinedHandText({
  colors,
  children,
  style,
}: {
  colors: Colors;
  children: React.ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        whiteSpace: "pre-wrap",
        color: "#465660",
        fontFamily: '"LXGW WenKai", "Ma Shan Zheng", "Kaiti SC", "KaiTi", "STKaiti", cursive',
        fontSize: "23px",
        lineHeight: "36px",
        backgroundImage: `repeating-linear-gradient(transparent, transparent 35px, ${colors.line} 35px, ${colors.line} 36px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function DateCircle({ colors, travelDate }: { colors: Colors; travelDate: string }) {
  return (
    <div
      style={{
        width: "46px",
        height: "46px",
        borderRadius: "50%",
        border: `2px solid ${colors.blue}`,
        color: colors.blue,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: '"Nanum Myeongjo", serif',
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: "10px", fontWeight: 700 }}>{monthShort(travelDate)}</span>
      <span style={{ fontSize: "17px", fontWeight: 700 }}>{dayNumber(travelDate)}</span>
    </div>
  );
}

function KeywordCloud({ keywords, colors }: { keywords: string[]; colors: Colors }) {
  if (keywords.length === 0) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
      {keywords.map((keyword) => (
        <span
          key={keyword}
          style={{
            padding: "4px 10px",
            borderRadius: "999px",
            border: `1px solid ${colors.accentSoft}`,
            background: colors.surface,
            color: colors.accent,
            fontSize: "11px",
            fontWeight: 700,
          }}
        >
          {keyword}
        </span>
      ))}
    </div>
  );
}

function Footer({ colors, authorName, travelDate }: { colors: Colors; authorName: string; travelDate: string }) {
  return (
    <footer
      style={{
        marginTop: "24px",
        borderTop: `1px solid ${colors.line}`,
        paddingTop: "12px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        color: colors.muted,
      }}
    >
      <div>
        <p style={{ margin: "0 0 3px", fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase" }}>
          recalled by Conch AI
        </p>
        <p style={{ margin: 0, fontSize: "12px" }}>
          {authorName} · {fullDate(travelDate)}
        </p>
      </div>
      <div style={{ display: "flex", gap: "4px" }}>
        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: colors.accent }} />
        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: colors.blue }} />
        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: colors.line }} />
      </div>
    </footer>
  );
}

function SceneRows({ capsules, colors, compact = false }: { capsules: Capsule[]; colors: Colors; compact?: boolean }) {
  return (
    <section style={{ display: "grid", gap: compact ? "10px" : "12px" }}>
      {capsules.slice(0, 3).map((capsule) => (
        <article
          key={capsule.id}
          style={{
            display: "grid",
            gridTemplateColumns: compact ? "76px 1fr" : "66px 1fr",
            gap: "12px",
            alignItems: "center",
            borderTop: compact ? `1px solid ${colors.line}` : undefined,
            paddingTop: compact ? "10px" : 0,
          }}
        >
          <div
            style={{
              width: compact ? "76px" : "66px",
              height: compact ? "86px" : "66px",
              overflow: "hidden",
              borderRadius: compact ? "0" : "7px",
              background: colors.accentSoft,
              boxShadow: compact ? undefined : "0 4px 10px rgba(49,37,25,.08)",
            }}
          >
            {capsule.photoUrls?.[0] && (
              <img
                src={capsule.photoUrls[0]}
                alt=""
                crossOrigin="anonymous"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: "0 0 3px", color: colors.ink, fontSize: "14px", fontWeight: 800 }}>
              {capsule.title}
            </p>
            <p style={{ margin: "0 0 4px", color: colors.accent, fontSize: "11px", fontWeight: 700 }}>
              {capsule.location}
            </p>
            <p
              style={{
                margin: 0,
                color: colors.muted,
                fontSize: "12px",
                lineHeight: 1.55,
                display: "-webkit-box",
                WebkitLineClamp: compact ? 3 : 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              } as CSSProperties}
            >
              {capsule.userRawText || capsule.aiContent}
            </p>
          </div>
        </article>
      ))}
    </section>
  );
}

// Kept as a reference layout while the paper option uses VintageCollageVariant.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function PaperVariant({
  journey,
  capsules,
  journalText,
  authorName,
  travelDate,
}: ExportCanvasVariantProps) {
  const colors = {
    ...palette.paper,
    accent: "#827969",
    accentSoft: "#E7DDD0",
    blue: "#9B9385",
  };
  const photos = allPhotos(capsules);
  const paragraphs = textLines(journalText, "今天的旅途像海声一样被慢慢唤回。");
  const keywords = [...new Set(capsules.flatMap((c) => c.keywords ?? []))].slice(0, 7);
  const leadText = clip(paragraphs.join(" "), 210);
  const destination = journey?.destination ?? "旅途";
  const leadPhoto = photos[0];
  const secondPhoto = photos[1] ?? photos[0];
  const thirdPhoto = photos[2] ?? photos[0];

  return (
    <CanvasShell colors={colors}>
      <div
        style={{
          minHeight: "100%",
          padding: "26px 20px 18px",
          position: "relative",
          background:
            "radial-gradient(circle at 18% 0%, rgba(255,255,255,.92), transparent 34%), linear-gradient(180deg, #FBF8F0 0%, #F2EADB 100%)",
        }}
      >
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <DateCircle colors={colors} travelDate={travelDate} />
            <div
              style={{
                color: "#40515B",
                fontFamily: '"Caveat", cursive',
                fontSize: "26px",
                lineHeight: 1,
                transform: "rotate(-1deg)",
              }}
            >
              Travel memories...
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 4px)", gap: "8px", opacity: 0.55 }}>
            {[0, 1, 2, 3].map((dot) => (
              <span key={dot} style={{ width: 4, height: 4, borderRadius: "50%", background: colors.blue }} />
            ))}
          </div>
        </header>

        <section
          style={{
            position: "relative",
            marginTop: "26px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "24px",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: "3px",
              top: "182px",
              width: "54px",
              height: "48px",
              border: `1px solid ${colors.line}`,
              color: "#B0A698",
              fontFamily: '"Caveat", cursive',
              fontSize: "15px",
              lineHeight: 1.1,
              transform: "rotate(-10deg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
            }}
          >
            {clip(destination, 8)}
            <br />
            LOG
          </div>

          <div style={{ width: "285px", position: "relative", zIndex: 2 }}>
            <Polaroid
              photo={leadPhoto}
              caption={leadPhoto?.location ?? "Crystal clear"}
              rotate="2deg"
              ratio="4 / 5"
              colors={colors}
            />
          </div>

          <LinedHandText
            colors={colors}
            style={{
              position: "relative",
              zIndex: 3,
              width: "308px",
              minHeight: "216px",
              padding: "0 4px 8px",
              transform: "rotate(-0.6deg)",
            }}
          >
            {leadText}
          </LinedHandText>

          <svg
            width="42"
            height="42"
            viewBox="0 0 100 100"
            fill="none"
            stroke={colors.blue}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ position: "absolute", right: "18px", bottom: "4px", opacity: 0.55 }}
          >
            <path d="M 24 44 C 24 22, 76 22, 76 44" />
            <path d="M 24 44 C 34 53, 42 45, 50 45 C 58 45, 66 53, 76 44" />
            <path d="M 34 50 Q 28 69 38 88" />
            <path d="M 50 48 Q 50 72 50 92" />
            <path d="M 66 50 Q 72 69 62 88" />
          </svg>

        </section>

        <section aria-hidden="true" style={{ display: "none" }}>
          <div style={{ width: "312px", marginLeft: "4px", transform: "rotate(-1deg)" }}>
            <div
              style={{
                position: "relative",
                padding: "8px 8px 24px",
                background: "#FFFFFF",
                boxShadow: "0 9px 20px rgba(49,37,25,0.13)",
              }}
            >
              <Tape colors={colors} variant="dot" style={{ left: "24px", top: "-7px", transform: "rotate(8deg)" }} />
              <div style={{ aspectRatio: "4 / 3", overflow: "hidden", background: colors.accentSoft }}>
                {secondPhoto && (
                  <img
                    src={secondPhoto.url}
                    alt=""
                    crossOrigin="anonymous"
                    style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
                  />
                )}
              </div>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  pointerEvents: "none",
                }}
              >
                <div
                  style={{
                    width: "58px",
                    height: "58px",
                    borderRadius: "50%",
                    background: "rgba(255,255,255,.66)",
                    border: "1px solid rgba(255,255,255,.78)",
                    boxShadow: "0 4px 16px rgba(37,30,22,.16)",
                    color: "#7F8D91",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "22px",
                    paddingLeft: "3px",
                  }}
                >
                  ▶
                </div>
              </div>
            </div>
          </div>

          <div style={{ position: "absolute", right: "-8px", bottom: "-18px", width: "152px" }}>
            <Polaroid photo={thirdPhoto} caption="KODAK" rotate="5deg" ratio="4 / 3" colors={colors} dark />
          </div>

          <div style={{ position: "absolute", left: "-10px", top: "78px", color: "#E4C45D", fontSize: "30px" }}>
            ☆
          </div>
        </section>

        <div aria-hidden="true" style={{ display: "none" }}>
          <SceneRows capsules={capsules} colors={colors} />
        </div>

        <div aria-hidden="true" style={{ display: "none" }}>
          <KeywordCloud keywords={keywords} colors={colors} />
        </div>

        <Footer colors={colors} authorName={authorName} travelDate={travelDate} />
      </div>
    </CanvasShell>
  );
}

function AquaVariant({
  journey,
  capsules,
  journalText,
  activeStyle,
  authorName,
  travelDate,
}: ExportCanvasVariantProps) {
  const colors = palette.aqua;
  const photos = allPhotos(capsules);
  const paragraphs = textLines(journalText, "今天的照片、声音和感受被收进一页轻盈的旅行本。");
  const keywords = [...new Set(capsules.flatMap((c) => c.keywords ?? []))].slice(0, 7);

  return (
    <CanvasShell colors={colors}>
      <div style={{ padding: "24px 20px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <DateCircle colors={colors} travelDate={travelDate} />
            <span style={{ color: colors.accent, fontSize: "11px", fontWeight: 800, letterSpacing: "0.18em" }}>
              CONCH
            </span>
          </div>
          <span style={{ color: colors.muted, fontSize: "10px" }}>{STYLE_LABELS[activeStyle]?.label}</span>
        </div>

        <section style={{ marginTop: "22px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", alignItems: "end" }}>
            <div>
              <p style={{ margin: "0 0 12px", color: colors.muted, fontSize: "11px", letterSpacing: "0.18em" }}>
                TRAVEL LOG / {monthDay(travelDate)}
              </p>
              <h1
                style={{
                  margin: 0,
                  color: colors.ink,
                  fontFamily: '"Nanum Myeongjo", serif',
                  fontSize: "29px",
                  lineHeight: 1.25,
                  fontWeight: 700,
                }}
              >
                {journey?.destination ?? "旅途"}
              </h1>
            </div>
            <Polaroid photo={photos[0]} caption="sea breeze" rotate="2deg" ratio="3 / 4" colors={colors} />
          </div>

          <div
            style={{
              marginTop: "14px",
              padding: "16px",
              background: "rgba(255,255,250,0.78)",
              border: `1px solid ${colors.line}`,
              borderRadius: "18px",
              boxShadow: "0 12px 28px rgba(44,77,82,.08)",
            }}
          >
            <p style={{ margin: 0, color: colors.ink, fontFamily: '"Nanum Myeongjo", serif', fontSize: "16px", lineHeight: 1.9 }}>
              {clip(paragraphs.slice(0, 2).join(" "), 210)}
            </p>
          </div>

          <div style={{ marginTop: "14px", display: "grid", gridTemplateColumns: "1.05fr .95fr", gap: "12px" }}>
            <Polaroid photo={photos[1] ?? photos[0]} caption="quiet" rotate="-2deg" ratio="4 / 3" colors={colors} />
            <div style={{ display: "grid", gap: "12px" }}>
              <AudioPill colors={colors} />
              <div style={{ background: colors.accentSoft, padding: "12px", textAlign: "center", transform: "rotate(-2deg)" }}>
                <p style={{ margin: "0 0 5px", color: colors.muted, fontSize: "9px", letterSpacing: "0.18em" }}>DATE</p>
                <p style={{ margin: 0, color: colors.ink, fontFamily: '"Caveat", cursive', fontSize: "24px", lineHeight: 1 }}>
                  {monthDay(travelDate)}
                </p>
              </div>
            </div>
          </div>
        </section>

        <div style={{ marginTop: "20px" }}>
          <SceneRows capsules={capsules} colors={colors} />
        </div>
        <div style={{ marginTop: "18px" }}>
          <KeywordCloud keywords={keywords} colors={colors} />
        </div>
        <Footer colors={colors} authorName={authorName} travelDate={travelDate} />
      </div>
    </CanvasShell>
  );
}

function EditorialVariant({
  journey,
  capsules,
  journalText,
  activeStyle,
  authorName,
  travelDate,
}: ExportCanvasVariantProps) {
  const colors = palette.editorial;
  const photos = allPhotos(capsules);
  const paragraphs = textLines(journalText, "今天的旅程被整理成一份温柔的旅行剪报。");
  const keywords = [...new Set(capsules.flatMap((c) => c.keywords ?? []))].slice(0, 7);

  return (
    <CanvasShell colors={colors}>
      <div style={{ padding: "20px 18px 18px" }}>
        <div style={{ border: `1px solid ${colors.line}`, background: colors.surface, padding: "14px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: `1px solid ${colors.line}`,
              paddingBottom: "10px",
            }}
          >
            <span style={{ color: colors.accent, fontSize: "11px", fontWeight: 800, letterSpacing: "0.18em" }}>
              CONCH
            </span>
            <span style={{ color: colors.muted, fontSize: "10px" }}>{STYLE_LABELS[activeStyle]?.label}</span>
          </div>

          <h1
            style={{
              margin: "16px 0 12px",
              color: colors.ink,
              fontFamily: '"Nanum Myeongjo", serif',
              fontSize: "31px",
              lineHeight: 1.18,
              fontWeight: 700,
            }}
          >
            {journey?.destination ?? "旅途"}
          </h1>

          <div style={{ display: "grid", gridTemplateColumns: "1.15fr .85fr", gap: "10px" }}>
            <div style={{ overflow: "hidden", aspectRatio: "4 / 5", background: colors.accentSoft }}>
              {photos[0] && (
                <img src={photos[0].url} alt="" crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              )}
            </div>
            <div style={{ display: "grid", gap: "10px" }}>
              <div style={{ overflow: "hidden", aspectRatio: "1 / 1", background: colors.accentSoft }}>
                {photos[1] && (
                  <img src={photos[1].url} alt="" crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                )}
              </div>
              <div style={{ background: colors.accentSoft, padding: "12px", textAlign: "center", transform: "rotate(-2deg)" }}>
                <p style={{ margin: "0 0 5px", color: colors.muted, fontSize: "9px", letterSpacing: "0.18em" }}>DATE</p>
                <p style={{ margin: 0, color: colors.ink, fontFamily: '"Caveat", cursive', fontSize: "24px", lineHeight: 1 }}>
                  {monthDay(travelDate)}
                </p>
              </div>
            </div>
          </div>

          <p style={{ margin: "16px 0 0", color: colors.ink, fontFamily: '"Nanum Myeongjo", serif', fontSize: "15px", lineHeight: 1.9 }}>
            {clip(paragraphs.join(" "), 260)}
          </p>
        </div>

        <div style={{ marginTop: "20px" }}>
          <SceneRows capsules={capsules} colors={colors} compact />
        </div>
        <div style={{ marginTop: "18px" }}>
          <KeywordCloud keywords={keywords} colors={colors} />
        </div>
        <Footer colors={colors} authorName={authorName} travelDate={travelDate} />
      </div>
    </CanvasShell>
  );
}

// Kept temporarily for visual comparison while the paper export uses the modular collage.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function VintageCollageVariant({
  journey,
  capsules,
  journalText,
  authorName,
  travelDate,
}: ExportCanvasVariantProps) {
  const colors = palette.paper;
  const photos = allPhotos(capsules);
  const photoAt = (index: number) => photos[index % Math.max(photos.length, 1)];
  const keywords = [...new Set(capsules.flatMap((c) => c.keywords ?? []))].slice(0, 4);
  const noteText = clip(
    capsules[0]?.userRawText || capsules[0]?.aiContent || journalText || "把旅途里的碎片慢慢贴成一页。",
    88
  );
  const destination = clip(journey?.destination ?? "旅途", 13);

  return (
    <CanvasShell colors={colors}>
      <div
        style={{
          position: "relative",
          height: "690px",
          overflow: "hidden",
          background: "#FAF5EA",
          boxShadow: "inset 0 0 0 1px rgba(207,194,169,.42)",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 186,
            top: 18,
            bottom: 18,
            width: 1,
            background: "rgba(202,190,166,.48)",
          }}
        />
        <div style={{ position: "absolute", left: 24, top: 24, zIndex: 10 }}>
          <DateCircle colors={colors} travelDate={travelDate} />
        </div>
        <p
          style={{
            position: "absolute",
            right: 24,
            top: 35,
            margin: 0,
            color: "#8B8376",
            fontSize: 9,
            fontWeight: 800,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
          }}
        >
          memory log
        </p>

        <div style={{ position: "absolute", left: 46, top: 92, width: 105, height: 128, background: "#E8DED0", transform: "rotate(-2deg)" }} />
        <Polaroid photo={photoAt(0)} caption={photoAt(0)?.location ?? "memory"} rotate="-3deg" ratio="1 / 1" colors={colors} tapeVariant="cream" style={{ position: "absolute", left: 34, top: 116, width: 116, zIndex: 5 }} />
        <Tape colors={colors} variant="cream" style={{ left: 24, top: 105, transform: "rotate(-8deg)", zIndex: 8 }} />

        <div
          style={{
            position: "absolute",
            left: 112,
            top: 152,
            width: 112,
            padding: 8,
            background: "#171A1D",
            boxShadow: "0 9px 18px rgba(43,34,24,.18)",
            transform: "rotate(1.5deg)",
            zIndex: 4,
          }}
        >
          <p style={{ margin: "0 0 4px", color: "#BDAF8E", fontSize: 7, letterSpacing: ".16em" }}>FILM SCAN</p>
          <div style={{ aspectRatio: "4 / 5", overflow: "hidden", background: "#DDD6C9" }}>
            {photoAt(1) && <img src={photoAt(1).url} alt="" crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", filter: "saturate(.88) contrast(.97)" }} />}
          </div>
          <p style={{ margin: "5px 0 0", color: "#CDBB93", fontSize: 7, letterSpacing: ".12em" }}>LIFELOG / ISO 800</p>
        </div>

        <div
          style={{
            position: "absolute",
            left: 31,
            top: 304,
            width: 123,
            color: "#3F3B35",
            fontFamily: '"LXGW WenKai", "Ma Shan Zheng", "Kaiti SC", "KaiTi", cursive',
            fontSize: 15,
            lineHeight: "24px",
            transform: "rotate(-1.3deg)",
            backgroundImage: "repeating-linear-gradient(transparent, transparent 23px, rgba(86,82,70,.38) 23px, rgba(86,82,70,.38) 24px)",
            zIndex: 8,
          }}
        >
          {noteText}
        </div>

        <div style={{ position: "absolute", left: 61, bottom: 98, width: 126, height: 150, overflow: "hidden", background: "#D7D0C2", transform: "rotate(-1.8deg)", zIndex: 2 }}>
          {photoAt(2) && <img src={photoAt(2).url} alt="" crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", filter: "saturate(.78) contrast(.94)" }} />}
        </div>
        <Polaroid photo={photoAt(3)} caption={photoAt(3)?.location ?? "detail"} rotate="3deg" ratio="4 / 3" colors={colors} tapeVariant="cream" style={{ position: "absolute", left: 110, bottom: 92, width: 118, zIndex: 6 }} />

        <div style={{ position: "absolute", right: 38, top: 93, width: 124, height: 210, background: "rgba(214,207,190,.65)", transform: "rotate(-1deg)", zIndex: 1 }} />
        <div style={{ position: "absolute", right: 28, top: 124, width: 120, height: 142, overflow: "hidden", background: "#DDD6C9", border: "1px solid rgba(255,255,255,.88)", boxShadow: "0 8px 17px rgba(43,34,24,.14)", transform: "rotate(-2deg)", zIndex: 5 }}>
          {photoAt(4) && <img src={photoAt(4).url} alt="" crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", filter: "saturate(.9) contrast(.95)" }} />}
        </div>
        <Tape colors={colors} variant="dot" style={{ right: 70, top: 111, transform: "rotate(4deg)", zIndex: 9 }} />

        <div style={{ position: "absolute", right: 82, top: 288, width: 86, padding: 6, background: "#202020", transform: "rotate(-3deg)", zIndex: 7, boxShadow: "0 7px 14px rgba(43,34,24,.16)" }}>
          <div style={{ aspectRatio: "3 / 4", overflow: "hidden", background: "#DDD6C9" }}>
            {photoAt(5) && <img src={photoAt(5).url} alt="" crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", filter: "saturate(.82)" }} />}
          </div>
          <div style={{ height: 18, background: "#FAF5EA", marginTop: 5 }} />
        </div>
        <div style={{ position: "absolute", right: 29, bottom: 116, width: 124, height: 118, overflow: "hidden", background: "#DDD6C9", boxShadow: "0 6px 14px rgba(43,34,24,.13)", zIndex: 4 }}>
          {photoAt(6) && <img src={photoAt(6).url} alt="" crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", filter: "saturate(.82) contrast(.96)" }} />}
        </div>

        <div
          style={{
            position: "absolute",
            right: 109,
            bottom: 204,
            width: 70,
            height: 78,
            border: "1px solid rgba(104,98,84,.45)",
            background: "rgba(255,252,244,.88)",
            transform: "rotate(-1deg)",
            zIndex: 8,
            textAlign: "center",
            color: "#595349",
            fontFamily: '"Caveat", "Kaiti SC", cursive',
            fontSize: 16,
            lineHeight: 1.25,
            paddingTop: 10,
          }}
        >
          {destination}
          <br />
          {monthDay(travelDate)}
        </div>

        <p style={{ position: "absolute", left: 55, bottom: 27, margin: 0, color: "#9A9284", fontSize: 9, letterSpacing: "0.16em", lineHeight: 1.6 }}>
          /slow
          <br />
          /travel
          <br />
          /memory
        </p>
        <div style={{ position: "absolute", left: 134, bottom: 36, borderRadius: "50%", background: "rgba(232,226,214,.92)", color: "#4B4740", transform: "rotate(-3deg)", fontFamily: '"LXGW WenKai", "Ma Shan Zheng", "Kaiti SC", cursive', fontSize: 20, padding: "9px 19px", zIndex: 10 }}>
          旅行一页
        </div>
        <div style={{ position: "absolute", right: 30, bottom: 30, display: "flex", gap: 5, zIndex: 10 }}>
          {keywords.map((keyword) => (
            <span key={keyword} style={{ border: "1px solid rgba(129,121,104,.32)", color: "#827969", background: "rgba(255,255,255,.7)", borderRadius: 10, padding: "3px 7px", fontSize: 8, fontWeight: 800 }}>
              {keyword}
            </span>
          ))}
        </div>

        <svg width="70" height="62" viewBox="0 0 70 62" style={{ position: "absolute", left: 24, top: 219, zIndex: 8, opacity: 0.46 }}>
          <g fill="none" stroke="#7C8478" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 18c8-10 18-10 28 0-8 10-18 10-28 0Z" />
            <path d="M46 18l9-6v12l-9-6Z" />
            <path d="M22 44c6-12 18-12 24 0" />
            <path d="M27 45c-4 5-7 7-11 8" />
            <path d="M39 45c4 5 7 7 11 8" />
            <path d="M33 45v12" />
          </g>
        </svg>
        <svg width="76" height="70" viewBox="0 0 76 70" style={{ position: "absolute", right: 22, top: 35, zIndex: 8, opacity: 0.42 }}>
          <g fill="none" stroke="#8B8376" strokeWidth="1.1" strokeLinecap="round">
            {[0, 1, 2, 3].map((row) =>
              [0, 1, 2, 3].map((col) => <circle key={`${row}-${col}`} cx={10 + col * 13} cy={10 + row * 12} r="3" />)
            )}
            <path d="M64 8c7 9 7 17 0 26-7-9-7-17 0-26Z" />
            <path d="M65 43c5 6 5 12 0 18-5-6-5-12 0-18Z" />
          </g>
        </svg>
        <p style={{ position: "absolute", right: 25, bottom: 14, margin: 0, color: "#AAA193", fontSize: 8, letterSpacing: "0.18em", textTransform: "uppercase" }}>
          {authorName} / Conch
        </p>
      </div>
    </CanvasShell>
  );
}

function ModularVintageCollageVariant({
  journey,
  capsules,
  journalText,
  activeStyle,
  authorName,
  travelDate,
}: ExportCanvasVariantProps) {
  const colors: Colors = {
    ...palette.paper,
    page: "#F7F1E6",
    surface: "#FFFDF7",
    ink: "#34312B",
    muted: "#776F63",
    line: "#D8CCB9",
    accent: "#8D7F6B",
    accentSoft: "#EAE0D0",
    blue: "#A8AEA4",
  };
  const demoCapsules = DEMO_CAPSULES as unknown as Capsule[];
  const sourceJourney = journey ?? (DEMO_JOURNEY as unknown as Journey);
  const incomingPhotos = allPhotos(capsules);
  const shouldUseDemoFallback = incomingPhotos.length === 0;
  const sourceCapsules = shouldUseDemoFallback ? demoCapsules : capsules;
  const isDefaultDemoJourney =
    shouldUseDemoFallback ||
    sourceCapsules.some((capsule) => String(capsule.id).startsWith("demo-capsule"));
  const photos = shouldUseDemoFallback ? allPhotos(demoCapsules) : incomingPhotos;
  const photoAt = (index: number) => (photos.length ? photos[index % photos.length] : undefined);
  const demoKeywords = ["竹林", "温泉", "市场", "夜色"];
  const keywords = isDefaultDemoJourney
    ? demoKeywords
    : [...new Set(sourceCapsules.flatMap((c) => c.keywords ?? []))].slice(0, 4);
  const fallbackText = isDefaultDemoJourney
    ? "修善寺的白雾、竹林、清晨市场和东京夜色，被贴进这一页慢旅行记忆。"
    : sourceCapsules[0]?.aiContent || sourceCapsules[0]?.userRawText || "把旅途里的碎片慢慢贴成一页。";
  const capsuleTextSummary = sourceCapsules
    .map((capsule) => capsule.userRawText || capsule.aiContent)
    .filter(Boolean)
    .join(" ");
  const safeJournalText = looksMojibake(journalText) ? "" : journalText;
  const sourceJournalText = isDefaultDemoJourney
    ? fallbackText
    : capsuleTextSummary || safeJournalText || fallbackText;
  const noteText = clip(textLines(sourceJournalText, fallbackText).join(" "), 34);
  const detailCapsules = sourceCapsules.slice(0, 3);
  const detailLabels = isDefaultDemoJourney
    ? ["修善寺竹林", "筑地清晨", "新宿雨夜"]
    : detailCapsules.map((capsule) => capsule.title);
  const destination = isDefaultDemoJourney ? "日本 · 伊豆 · 东京" : cleanScrapbookTitle(sourceJourney?.destination, "Travel");
  const title = isDefaultDemoJourney ? "伊豆旅记" : cleanScrapbookTitle(sourceJourney?.destination, "Travel");

  const renderPhotoBlock = ({
    photo,
    dark = false,
  }: {
    photo?: Photo;
    dark?: boolean;
  }) => (
    <div
      style={{
        background: dark ? "#202020" : "#FFFFFF",
        border: dark ? "1px solid #2E2C28" : `1px solid ${colors.line}`,
        padding: "7px 7px 12px",
        boxShadow: "0 8px 16px rgba(58,45,29,0.12)",
        boxSizing: "border-box",
        display: "grid",
        gridTemplateRows: "minmax(0, 1fr)",
        height: "100%",
        minWidth: 0,
        position: "relative",
      }}
    >
      <Tape
        colors={colors}
        variant={dark ? "dot" : "cream"}
        style={{ left: "50%", top: "-8px", transform: "translateX(-50%) rotate(-3deg)", width: 46, height: 15, opacity: 0.5 }}
      />
      <div style={{ minHeight: 0, overflow: "hidden", background: colors.accentSoft }}>
        {photo ? (
          <img
            src={photo.url}
            alt=""
            crossOrigin="anonymous"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              filter: dark ? "saturate(.82) contrast(1.03)" : "saturate(.88) contrast(.98)",
            }}
          />
        ) : (
          <div style={{ height: "100%", display: "grid", placeItems: "center", color: colors.muted, fontSize: 10 }}>
            photo
          </div>
        )}
      </div>
    </div>
  );

  const renderDetailCard = (index: number) => {
    const capsule = detailCapsules[index];
    const photo = photoAt(index + 4);
    const label = clip(detailLabels[index] ?? capsule?.title ?? photo?.title ?? `memo ${index + 1}`, 8);

    return (
      <div key={index} style={{ minWidth: 0, display: "grid", gridTemplateRows: "74px 18px", gap: 6 }}>
        <div style={{ overflow: "hidden", background: colors.accentSoft, border: `1px solid ${colors.line}` }}>
          {photo && (
            <img
              src={photo.url}
              alt=""
              crossOrigin="anonymous"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", filter: "saturate(.82) contrast(.96)" }}
            />
          )}
        </div>
        <div
          style={{
            color: colors.ink,
            fontSize: 10,
            lineHeight: "18px",
            height: 18,
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
          }}
        >
          {label}
        </div>
      </div>
    );
  };

  return (
    <CanvasShell colors={colors}>
      <div
        style={{
          position: "relative",
          minHeight: "720px",
          overflow: "hidden",
          background:
            "linear-gradient(90deg, transparent 0 184px, rgba(207,195,172,.44) 184px 185px, transparent 185px), #FAF5EA",
          padding: "18px 18px 16px",
          boxShadow: "inset 0 0 0 1px rgba(207,194,169,.44)",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "96px 1fr", gap: 12, alignItems: "start", minHeight: 76 }}>
          <div
            style={{
              height: 68,
              border: `1px solid ${colors.line}`,
              background: "rgba(255,253,247,.72)",
              display: "grid",
              placeItems: "center",
              textAlign: "center",
              color: colors.ink,
            }}
          >
            <div>
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.16em", color: colors.muted }}>DATE</div>
              <div style={{ marginTop: 4, fontFamily: '"Nanum Myeongjo", serif', fontSize: 19, fontWeight: 700 }}>
                {monthDay(travelDate)}
              </div>
            </div>
          </div>
          <div style={{ minWidth: 0, paddingTop: 2 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <span style={{ color: colors.muted, fontSize: 8, fontWeight: 900, letterSpacing: "0.2em" }}>FLOWMEMO</span>
              <span style={{ color: colors.muted, fontSize: 8, fontWeight: 800, letterSpacing: "0.12em" }}>
                {STYLE_LABELS[activeStyle]?.label}
              </span>
            </div>
            <h1
              style={{
                margin: "10px 0 0",
                color: colors.ink,
                fontFamily: '"LXGW WenKai", "Kaiti SC", "KaiTi", "STKaiti", serif',
                fontSize: 24,
                lineHeight: 1.12,
                fontWeight: 400,
                maxHeight: 54,
                overflow: "hidden",
                wordBreak: "break-all",
              }}
            >
              {title}
            </h1>
            <div style={{ marginTop: 7, color: colors.muted, fontSize: 9, letterSpacing: "0.08em" }}>
              {destination} / {fullDate(travelDate)}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 12, height: 292, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateRows: "178px 104px", gap: 10, minWidth: 0 }}>
            <div style={{ transform: "rotate(-1deg)", transformOrigin: "50% 50%" }}>
              {renderPhotoBlock({ photo: photoAt(0) })}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {renderPhotoBlock({ photo: photoAt(1), dark: true })}
              {renderPhotoBlock({ photo: photoAt(2) })}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateRows: "126px 156px", gap: 10, minWidth: 0 }}>
            <div style={{ transform: "rotate(1deg)", transformOrigin: "50% 50%" }}>
              {renderPhotoBlock({ photo: photoAt(3) })}
            </div>
            <div
              style={{
                background: "rgba(255,253,247,.78)",
                border: `1px solid ${colors.line}`,
                padding: "12px 12px 10px",
                minWidth: 0,
                boxShadow: "0 7px 14px rgba(58,45,29,.08)",
              }}
            >
              <div
                style={{
                  color: colors.muted,
                  fontSize: 8,
                  fontWeight: 900,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                notebook
              </div>
              <p
                style={{
                  margin: 0,
                  color: colors.ink,
                  fontFamily: '"LXGW WenKai", "Kaiti SC", "KaiTi", serif',
                  fontSize: 13,
                  lineHeight: "22px",
                  height: 88,
                  overflow: "hidden",
                  wordBreak: "break-all",
                  backgroundImage:
                    "repeating-linear-gradient(transparent, transparent 21px, rgba(91,84,72,.24) 21px, rgba(91,84,72,.24) 22px)",
                }}
              >
                {noteText}
              </p>
              <div style={{ marginTop: 8, color: colors.muted, fontSize: 8, letterSpacing: "0.12em" }}>recorded by {authorName}</div>
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 10,
            padding: "10px 10px 8px",
            background: "rgba(239,230,213,.48)",
            border: `1px solid rgba(216,204,185,.74)`,
          }}
        >
          {[0, 1, 2].map((index) => renderDetailCard(index))}
        </div>

        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "92px 1fr", gap: 12, alignItems: "stretch" }}>
          <div
            style={{
              border: `1px solid ${colors.line}`,
              background: "rgba(255,253,247,.74)",
              padding: "10px 8px",
              textAlign: "center",
              color: colors.ink,
              minHeight: 74,
            }}
          >
            <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: "0.16em", color: colors.muted }}>TICKET</div>
            <div style={{ marginTop: 8, fontFamily: '"Nanum Myeongjo", serif', fontSize: 22, lineHeight: 1, fontWeight: 700 }}>
              {dayNumber(travelDate)}
            </div>
            <div style={{ marginTop: 7, color: colors.muted, fontSize: 8, letterSpacing: "0.12em" }}>{monthShort(travelDate)}</div>
          </div>
          <div
            style={{
              borderTop: `1px solid ${colors.line}`,
              borderBottom: `1px solid ${colors.line}`,
              padding: "10px 0",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              minWidth: 0,
            }}
          >
            <div style={{ color: colors.muted, fontSize: 8, fontWeight: 900, letterSpacing: "0.18em" }}>SLOW TRAVEL LOG</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {(keywords.length ? keywords : ["slow", "memo", "route"]).map((keyword) => (
                <span
                  key={keyword}
                  style={{
                    maxWidth: 92,
                    border: `1px solid rgba(119,111,99,.34)`,
                    background: "rgba(255,253,247,.68)",
                    color: colors.muted,
                    padding: "4px 7px",
                    fontSize: 8,
                    fontWeight: 800,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {keyword}
                </span>
              ))}
            </div>
            <div style={{ marginTop: 9, color: colors.muted, fontSize: 8, letterSpacing: "0.12em" }}>{authorName} / FlowMemo</div>
          </div>
        </div>

      </div>
    </CanvasShell>
  );
}

export const ExportCanvas = forwardRef<HTMLDivElement, ExportCanvasProps>(
  ({ journey, capsules, journalText, activeStyle, authorName = "旅人", variant = "paper", travelDate = "" }, ref) => {
    const props = { journey, capsules, journalText, activeStyle, authorName, travelDate };

    return (
      <div ref={ref}>
        {variant === "paper" && <ModularVintageCollageVariant {...props} />}
        {variant === "aqua" && <AquaVariant {...props} />}
        {variant === "editorial" && <EditorialVariant {...props} />}
      </div>
    );
  }
);

ExportCanvas.displayName = "ExportCanvas";
