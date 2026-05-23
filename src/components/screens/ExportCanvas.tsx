"use client";

import { forwardRef } from "react";
import type { CSSProperties } from "react";
import type { Capsule, Journey, StyleKey } from "@/lib/journey-types";
import { STYLE_LABELS } from "@/lib/journey-types";

export type ExportCanvasVariant = "paper" | "aqua" | "editorial";

export const EXPORT_CANVAS_VARIANTS: { key: ExportCanvasVariant; label: string }[] = [
  { key: "paper", label: "轻盈拼贴" },
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
}

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

function monthShort() {
  return new Date().toLocaleString("en-US", { month: "short" }).toUpperCase();
}

function dayNumber() {
  return new Date().toLocaleString("en-US", { day: "2-digit" });
}

function monthDay() {
  return new Date().toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
}

function fullDate() {
  return new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" });
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
  style,
}: {
  photo?: Photo;
  caption: string;
  colors: Colors;
  rotate?: string;
  ratio?: string;
  dark?: boolean;
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
        variant={dark ? "dot" : "blue"}
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
        fontFamily: '"Caveat", cursive',
        fontSize: "25px",
        lineHeight: "32px",
        backgroundImage: `repeating-linear-gradient(transparent, transparent 31px, ${colors.line} 31px, ${colors.line} 32px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function DateCircle({ colors }: { colors: Colors }) {
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
      <span style={{ fontSize: "10px", fontWeight: 700 }}>{monthShort()}</span>
      <span style={{ fontSize: "17px", fontWeight: 700 }}>{dayNumber()}</span>
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

function Footer({ colors, authorName }: { colors: Colors; authorName: string }) {
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
          woven by FlowMemo AI
        </p>
        <p style={{ margin: 0, fontSize: "12px" }}>
          {authorName} · {fullDate()}
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

function PaperVariant({
  journey,
  capsules,
  journalText,
  activeStyle,
  authorName,
}: Required<Omit<ExportCanvasProps, "variant">>) {
  const colors = palette.paper;
  const photos = allPhotos(capsules);
  const paragraphs = textLines(journalText, "今天的旅途被慢慢织成一页手账。");
  const keywords = [...new Set(capsules.flatMap((c) => c.keywords ?? []))].slice(0, 7);
  const leadText = clip(paragraphs[0], 155);
  const styleLabel = STYLE_LABELS[activeStyle]?.label ?? "手账";
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
            <DateCircle colors={colors} />
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

        <section style={{ position: "relative", minHeight: "508px", marginTop: "22px" }}>
          <div
            style={{
              position: "absolute",
              left: "3px",
              top: "198px",
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

          <div style={{ width: "226px", marginLeft: "118px", position: "relative", zIndex: 2 }}>
            <Polaroid
              photo={leadPhoto}
              caption={leadPhoto?.location ?? "Crystal clear"}
              rotate="4deg"
              ratio="4 / 5"
              colors={colors}
            />
          </div>

          <LinedHandText
            colors={colors}
            style={{
              position: "relative",
              zIndex: 3,
              width: "286px",
              marginTop: "-4px",
              marginLeft: "20px",
              transform: "rotate(-1.2deg)",
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
            style={{ position: "absolute", right: "68px", bottom: "62px", opacity: 0.65 }}
          >
            <path d="M 24 44 C 24 22, 76 22, 76 44" />
            <path d="M 24 44 C 34 53, 42 45, 50 45 C 58 45, 66 53, 76 44" />
            <path d="M 34 50 Q 28 69 38 88" />
            <path d="M 50 48 Q 50 72 50 92" />
            <path d="M 66 50 Q 72 69 62 88" />
          </svg>

          <div style={{ position: "absolute", right: "-5px", bottom: "108px", transform: "rotate(92deg)" }}>
            <span style={{ color: colors.muted, fontFamily: '"Caveat", cursive', fontSize: "16px" }}>
              fig. 1 / {styleLabel}
            </span>
          </div>

          <AudioPill colors={colors} style={{ position: "absolute", left: "74px", right: "0", bottom: "0", zIndex: 5 }} />
        </section>

        <section style={{ position: "relative", marginTop: "20px", minHeight: "300px" }}>
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

        <div style={{ marginTop: "38px" }}>
          <SceneRows capsules={capsules} colors={colors} />
        </div>

        <div style={{ marginTop: "18px" }}>
          <KeywordCloud keywords={keywords} colors={colors} />
        </div>

        <Footer colors={colors} authorName={authorName} />
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
}: Required<Omit<ExportCanvasProps, "variant">>) {
  const colors = palette.aqua;
  const photos = allPhotos(capsules);
  const paragraphs = textLines(journalText, "今天的照片、声音和感受被收进一页轻盈的旅行本。");
  const keywords = [...new Set(capsules.flatMap((c) => c.keywords ?? []))].slice(0, 7);

  return (
    <CanvasShell colors={colors}>
      <div style={{ padding: "24px 20px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <DateCircle colors={colors} />
            <span style={{ color: colors.accent, fontSize: "11px", fontWeight: 800, letterSpacing: "0.18em" }}>
              FLOWMEMO
            </span>
          </div>
          <span style={{ color: colors.muted, fontSize: "10px" }}>{STYLE_LABELS[activeStyle]?.label}</span>
        </div>

        <section style={{ marginTop: "22px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", alignItems: "end" }}>
            <div>
              <p style={{ margin: "0 0 12px", color: colors.muted, fontSize: "11px", letterSpacing: "0.18em" }}>
                TRAVEL LOG / {monthDay()}
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
                  {monthDay()}
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
        <Footer colors={colors} authorName={authorName} />
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
}: Required<Omit<ExportCanvasProps, "variant">>) {
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
              FLOWMEMO
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
                  {monthDay()}
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
        <Footer colors={colors} authorName={authorName} />
      </div>
    </CanvasShell>
  );
}

export const ExportCanvas = forwardRef<HTMLDivElement, ExportCanvasProps>(
  ({ journey, capsules, journalText, activeStyle, authorName = "旅人", variant = "paper" }, ref) => {
    const props = { journey, capsules, journalText, activeStyle, authorName };

    return (
      <div ref={ref}>
        {variant === "paper" && <PaperVariant {...props} />}
        {variant === "aqua" && <AquaVariant {...props} />}
        {variant === "editorial" && <EditorialVariant {...props} />}
      </div>
    );
  }
);

ExportCanvas.displayName = "ExportCanvas";
