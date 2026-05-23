"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ImagePlus, Send, X } from "lucide-react";
import { storage } from "@eazo/sdk";
import { request } from "@/lib/api/request";
import { sanitizeDemoCapsuleDraft } from "@/lib/demo-guardrails";
import { DEMO_PIPELINE_INPUTS } from "@/lib/demo-data";
import { toast } from "sonner";

interface InputBarProps {
  journeyId: string;
  demoMode?: boolean;
  onCapsuleCreated: (capsule: Record<string, unknown>) => void;
}

type PhotoDraft = { file?: File; preview: string; url?: string; name?: string };

export function JourneyInputBar({ journeyId, demoMode = false, onCapsuleCreated }: InputBarProps) {
  const [text, setText] = useState("");
  const [photos, setPhotos] = useState<PhotoDraft[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  async function handleSend() {
    if (!text.trim() && photos.length === 0) return;
    setIsSending(true);
    setIsGenerating(true);

    try {
      // Upload photos first
      const photoUrls: string[] = [];
      for (const p of photos) {
        if (p.url) {
          photoUrls.push(p.url);
        } else {
          try {
            if (demoMode || !p.file) {
              photoUrls.push(p.preview);
              continue;
            }
            const { url } = await storage.upload(`journeys/${journeyId}/${p.file.name}`, p.file);
            photoUrls.push(url);
          } catch {
            toast.error("图片上传失败，跳过该图片");
          }
        }
      }

      // Generate AI capsule content
      let aiResult: { title?: string; location?: string; keywords?: string[]; content?: string } = {};

      if (text.trim()) {
        const composeRes = await fetch("/api/ai/compose", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userText: text.trim(), style: "cinematic", demoMode }),
        });

        if (composeRes.ok) {
          let rawText = "";
          const reader = composeRes.body!.getReader();
          const decoder = new TextDecoder();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            rawText += decoder.decode(value, { stream: true });
          }

          try {
            const cleaned = rawText.replace(/```json\n?|\n?```/g, "").trim();
            aiResult = JSON.parse(cleaned);
          } catch {
            aiResult = { title: "旅途记忆", content: rawText };
          }
        }
      }

      // Analyze first photo if no text
      if (photos.length > 0 && !text.trim() && photoUrls.length > 0 && !demoMode) {
        try {
          const firstFile = photos[0]?.file;
          if (!firstFile) throw new Error("missing image file");
          const fileReader = new FileReader();
          const base64 = await new Promise<string>((resolve) => {
            fileReader.onload = (e) => resolve((e.target?.result as string).split(",")[1]);
            fileReader.readAsDataURL(firstFile);
          });

          const analyzeRes = await request("/api/ai/analyze-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageBase64: base64, mimeType: firstFile.type }),
          });

          if (analyzeRes.ok) {
            const imgData = await analyzeRes.json();
            aiResult = {
              title: imgData.scene ?? "旅途一瞥",
              keywords: imgData.tags ?? [],
              content: imgData.suggestedCaption ?? "",
            };
          }
        } catch {
          aiResult = { title: "旅途一瞥", content: "镜头捕捉到的美丽瞬间。" };
        }
      }

      // Save capsule to DB
      if (demoMode) {
        if (!text.trim()) {
          const firstPhotoHint = [photos[0]?.name, photos[0]?.url, photos[0]?.preview].join(" ");
          const inferredText =
            firstPhotoHint.includes("bamboo") || firstPhotoHint.includes("修善寺")
              ? DEMO_PIPELINE_INPUTS[0].text
              : firstPhotoHint.includes("onsen") || firstPhotoHint.includes("温泉")
                ? DEMO_PIPELINE_INPUTS[1].text
                : firstPhotoHint.includes("tokyo") || firstPhotoHint.includes("新宿")
                  ? DEMO_PIPELINE_INPUTS[2].text
                  : "这张照片记录了旅途里的一个现场瞬间，适合被收进今日记忆胶囊。";

          aiResult = sanitizeDemoCapsuleDraft(inferredText, {
            title: "照片里的旅途瞬间",
            location: "旅途中",
            keywords: ["照片", "旅途", "现场"],
            content: "镜头先替你记下了这个瞬间，之后可以再补一句声音、气味或当时的心情。",
          });
        } else {
          aiResult = sanitizeDemoCapsuleDraft(text.trim(), aiResult);
        }
        onCapsuleCreated({
          id: `demo-live-${Date.now()}`,
          journeyId,
          userId: "demo-user",
          title: aiResult.title ?? "旅途记忆",
          location: aiResult.location ?? "",
          userRawText: text.trim(),
          aiContent: aiResult.content ?? "",
          aiContentStyle: "cinematic",
          keywords: aiResult.keywords ?? [],
          photoUrls,
          photoCount: photoUrls.length,
          capturedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        setText("");
        setPhotos([]);
        return;
      }

      const capsuleRes = await request(`/api/journeys/${journeyId}/capsules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: aiResult.title ?? "旅途记忆",
          location: aiResult.location ?? "",
          userRawText: text.trim(),
          aiContent: aiResult.content ?? "",
          keywords: aiResult.keywords ?? [],
          photoUrls,
        }),
      });

      if (!capsuleRes.ok) throw new Error("保存失败");
      const capsule = await capsuleRes.json();
      onCapsuleCreated(capsule);
      setText("");
      setPhotos([]);
    } catch {
      toast.error("生成失败，请再试一次");
    } finally {
      setIsSending(false);
      setIsGenerating(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const newPhotos = demoMode
      ? await Promise.all(
          files.map(
            (file) =>
              new Promise<PhotoDraft>((resolve) => {
                const reader = new FileReader();
                reader.onload = (event) => {
                  resolve({
                    file,
                    preview: String(event.target?.result ?? ""),
                    url: String(event.target?.result ?? ""),
                    name: file.name,
                  });
                };
                reader.readAsDataURL(file);
              })
          )
        )
      : files.map((file) => ({
          file,
          preview: URL.createObjectURL(file),
        }));
    setPhotos((prev) => [...prev, ...newPhotos].slice(0, 6));
    e.currentTarget.value = "";
  }

  function removePhoto(idx: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  }

  function applyDemoInput(sample: (typeof DEMO_PIPELINE_INPUTS)[number]) {
    setText(sample.text);
    setPhotos([{ preview: sample.image, url: sample.image, name: sample.label }]);
    textRef.current?.focus();
  }

  return (
    <div className="bg-[#0C0C0E] border-t border-[#1E1E24] px-4 pt-3 pb-[max(env(safe-area-inset-bottom),12px)] md:pb-3">
      {/* AI generating indicator */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="mb-2 flex items-center gap-2 text-[10px] text-[#E99A3F] font-mono"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#E99A3F] animate-ping" />
            AI 导演正在织入记忆...
          </motion.div>
        )}
      </AnimatePresence>

      {demoMode && (
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {DEMO_PIPELINE_INPUTS.map((sample) => (
            <button
              key={sample.label}
              type="button"
              aria-label={`使用 Demo 素材：${sample.label}`}
              onClick={() => applyDemoInput(sample)}
              className="flex-shrink-0 rounded-full border border-[#1E1E24] bg-[#121216] px-3 py-1.5 text-[10px] text-[#9E9EAF] transition-colors hover:border-[#E99A3F]/50 hover:text-[#F5F5F7]"
            >
              {sample.label}
            </button>
          ))}
        </div>
      )}

      {/* Photo previews */}
      <AnimatePresence>
        {photos.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex gap-2 mb-3 overflow-x-auto pb-1"
          >
            {photos.map((p, i) => (
              <motion.div
                key={p.preview}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative flex-shrink-0"
              >
                <img
                  src={p.preview}
                  alt=""
                  className="w-16 h-16 object-cover rounded-lg border border-[#1E1E24]"
                />
                <button
                  onClick={() => removePhoto(i)}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#DC2626] rounded-full flex items-center justify-center"
                >
                  <X size={10} className="text-white" />
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Text input row */}
      <div className="flex items-end gap-3">
        <div className="flex-1 bg-[#121216] border border-[#1E1E24] rounded-xl px-3 py-2.5 focus-within:border-[#E99A3F]/50 transition-colors">
          <textarea
            ref={textRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="随手说一句……"
            className="w-full bg-transparent text-base text-[#F5F5F7] placeholder-[#494954] focus:outline-none resize-none leading-relaxed"
            rows={1}
            style={{ maxHeight: "80px", minHeight: "24px" }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = Math.min(target.scrollHeight, 80) + "px";
            }}
          />
        </div>

        {/* Photo button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => fileRef.current?.click()}
          className="p-3 rounded-xl border border-[#1E1E24] bg-[#121216] text-[#9E9EAF] hover:border-[#E99A3F]/50 hover:text-[#E99A3F] transition-colors flex-shrink-0"
          aria-label="添加图片"
        >
          <ImagePlus size={18} />
        </motion.button>

        {/* Send button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleSend}
          disabled={isSending || (!text.trim() && photos.length === 0)}
          className="p-3 rounded-xl bg-[#E99A3F] text-[#0C0C0E] hover:brightness-110 disabled:opacity-40 transition-all flex-shrink-0"
          aria-label="发送"
        >
          {isSending ? (
            <div className="w-[18px] h-[18px] border-2 border-[#0C0C0E]/30 border-t-[#0C0C0E] rounded-full animate-spin" />
          ) : (
            <Send size={18} />
          )}
        </motion.button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
