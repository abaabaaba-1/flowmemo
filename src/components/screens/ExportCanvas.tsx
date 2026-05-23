"use client";

import { forwardRef } from "react";
import type { Capsule, Journey, StyleKey } from "@/lib/journey-types";
import { STYLE_LABELS } from "@/lib/journey-types";

interface ExportCanvasProps {
  journey: Journey | null;
  capsules: Capsule[];
  journalText: string;
  activeStyle: StyleKey;
  authorName?: string;
}

/**
 * 导出画卷 — 专门为 html2canvas 渲染的电影感手账海报
 * 固定宽度 375px，高度自适应，输出比例接近 3:4 竖版
 */
export const ExportCanvas = forwardRef<HTMLDivElement, ExportCanvasProps>(
  ({ journey, capsules, journalText, activeStyle, authorName = "旅人" }, ref) => {
    const date = new Date().toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const coverPhoto = capsules.find((c) => c.photoUrls && c.photoUrls.length > 0)?.photoUrls?.[0];
    const allKeywords = [...new Set(capsules.flatMap((c) => c.keywords ?? []))].slice(0, 6);

    const styleLabel = STYLE_LABELS[activeStyle]?.label ?? "电影旁白";

    // 最多展示 2 个胶囊的内容
    const previewCapsules = capsules.slice(0, 2);

    return (
      <div
        ref={ref}
        style={{
          width: "375px",
          background: "#0C0C0E",
          fontFamily: "Inter, sans-serif",
          color: "#F5F5F7",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* 封面大图 */}
        <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", overflow: "hidden" }}>
          {coverPhoto ? (
            <img
              src={coverPhoto}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              crossOrigin="anonymous"
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                background: "radial-gradient(ellipse at center, rgba(233,154,63,0.15) 0%, transparent 70%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ fontFamily: "monospace", fontSize: "10px", color: "#494954", letterSpacing: "0.2em" }}>
                NO PHOTO · MEMORY ONLY
              </span>
            </div>
          )}

          {/* 顶部遮罩 + 标题区 */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to bottom, rgba(12,12,14,0.8) 0%, transparent 40%, transparent 50%, rgba(12,12,14,0.95) 100%)",
            }}
          />

          {/* 左上角品牌 */}
          <div
            style={{
              position: "absolute",
              top: "14px",
              left: "16px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <div
              style={{
                width: "14px",
                height: "14px",
                borderRadius: "50%",
                border: "1px solid #E99A3F",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#E99A3F" }} />
            </div>
            <span style={{ fontFamily: "monospace", fontSize: "9px", color: "#E99A3F", letterSpacing: "0.25em", textTransform: "uppercase" }}>
              FlowMemo
            </span>
          </div>

          {/* 胶片打孔 */}
          <div style={{ position: "absolute", top: 0, bottom: 0, left: "6px", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "6px 0", opacity: 0.25 }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{ width: "4px", height: "6px", background: "white", borderRadius: "1px" }} />
            ))}
          </div>
          <div style={{ position: "absolute", top: 0, bottom: 0, right: "6px", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "6px 0", opacity: 0.25 }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{ width: "4px", height: "6px", background: "white", borderRadius: "1px" }} />
            ))}
          </div>

          {/* 底部 — 目的地标题 */}
          <div style={{ position: "absolute", bottom: "14px", left: "16px", right: "16px" }}>
            <p style={{ fontFamily: "monospace", fontSize: "9px", color: "#E99A3F", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "4px" }}>
              TODAY&apos;S CANVAS · {date}
            </p>
            <h1
              style={{
                fontSize: "22px",
                fontStyle: "italic",
                fontWeight: 400,
                lineHeight: 1.2,
                color: "#F5F5F7",
                margin: 0,
                fontFamily: '"Instrument Serif", Georgia, serif',
              }}
            >
              {journey?.destination ?? "我的旅途"}
            </h1>
          </div>
        </div>

        {/* 章节分隔线 */}
        <div
          style={{
            borderBottom: "1px solid #1E1E24",
            margin: "0 16px",
            paddingTop: "16px",
            paddingBottom: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          <div style={{ position: "absolute", bottom: "-6px", left: "50%", transform: "translateX(-50%)", background: "#0C0C0E", padding: "0 10px" }}>
            <span style={{ fontFamily: "monospace", fontSize: "8px", color: "#E99A3F", letterSpacing: "0.3em", textTransform: "uppercase" }}>
              CHAPTER I · {styleLabel}
            </span>
          </div>
        </div>

        {/* AI 手账正文 */}
        <div style={{ padding: "24px 20px 16px" }}>
          {journalText ? (
            <div>
              {journalText
                .split("\n")
                .filter(Boolean)
                .slice(0, 4)
                .map((para, i) => (
                  <p
                    key={i}
                    style={{
                      fontFamily: '"Instrument Serif", Georgia, serif',
                      fontSize: "14px",
                      lineHeight: 1.9,
                      color: "#F5F5F7",
                      margin: "0 0 12px 0",
                      textAlign: "justify",
                      fontStyle: "italic",
                    }}
                  >
                    {para}
                  </p>
                ))}
            </div>
          ) : (
            <p
              style={{
                fontFamily: '"Instrument Serif", Georgia, serif',
                fontSize: "14px",
                lineHeight: 1.9,
                color: "#9E9EAF",
                fontStyle: "italic",
              }}
            >
              旅途的故事，正在被织入记忆...
            </p>
          )}
        </div>

        {/* 胶囊摘要 */}
        {previewCapsules.length > 0 && (
          <div style={{ padding: "0 16px 16px" }}>
            <div style={{ borderTop: "1px dashed #1E1E24", paddingTop: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
              {previewCapsules.map((capsule, idx) => (
                <div key={capsule.id} style={{ display: "flex", gap: "12px" }}>
                  {/* 缩略图 */}
                  {capsule.photoUrls?.[0] ? (
                    <img
                      src={capsule.photoUrls[0]}
                      alt=""
                      style={{ width: "56px", height: "56px", objectFit: "cover", borderRadius: "6px", flexShrink: 0, border: "1px solid #1E1E24" }}
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <div
                      style={{
                        width: "56px",
                        height: "56px",
                        borderRadius: "6px",
                        background: "#1E1E24",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <span style={{ fontFamily: "monospace", fontSize: "8px", color: "#494954" }}>{String(idx + 1).padStart(2, "0")}</span>
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "12px", fontWeight: 600, color: "#F5F5F7", margin: "0 0 3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {capsule.title}
                    </p>
                    {capsule.location && (
                      <p style={{ fontFamily: "monospace", fontSize: "9px", color: "#E99A3F", margin: "0 0 4px", letterSpacing: "0.05em" }}>
                        {capsule.location}
                      </p>
                    )}
                    <p
                      style={{
                        fontSize: "11px",
                        color: "#9E9EAF",
                        fontStyle: "italic",
                        fontFamily: '"Instrument Serif", Georgia, serif',
                        margin: 0,
                        lineHeight: 1.5,
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      } as React.CSSProperties}
                    >
                      {capsule.aiContent?.slice(0, 60)}...
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 关键词云 */}
        {allKeywords.length > 0 && (
          <div style={{ padding: "0 16px 16px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {allKeywords.map((kw) => (
              <span
                key={kw}
                style={{
                  fontSize: "10px",
                  padding: "2px 8px",
                  borderRadius: "9999px",
                  background: "rgba(233,154,63,0.1)",
                  border: "1px solid rgba(233,154,63,0.2)",
                  color: "#E99A3F",
                }}
              >
                {kw}
              </span>
            ))}
          </div>
        )}

        {/* 底部落款 */}
        <div
          style={{
            borderTop: "1px solid #1E1E24",
            margin: "0 16px",
            padding: "14px 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <p style={{ fontFamily: "monospace", fontSize: "9px", color: "#494954", letterSpacing: "0.15em", textTransform: "uppercase", margin: 0 }}>
              Woven by FlowMemo AI
            </p>
            <p style={{ fontSize: "11px", color: "#9E9EAF", margin: "2px 0 0" }}>
              {authorName} · {date}
            </p>
          </div>
          <div style={{ display: "flex", gap: "3px" }}>
            <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#E99A3F" }} />
            <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#9E9EAF" }} />
            <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#494954" }} />
          </div>
        </div>
      </div>
    );
  }
);

ExportCanvas.displayName = "ExportCanvas";
