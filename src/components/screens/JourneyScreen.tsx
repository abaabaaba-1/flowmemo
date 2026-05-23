"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { storage } from "@eazo/sdk";
import { toast } from "sonner";
import {
  analyzeImage,
  composeCapsuleDraft,
  createJourneyCapsule,
  generatePromptSuggestions,
  getJourneyById,
  getJourneyCapsules,
  streamTravelChat,
  updateCapsule,
} from "@/lib/api";
import type { AnalyzeImageResult, PromptSuggestion } from "@/lib/api";
import type { Capsule, CapsuleEventType, Journey, StyleKey } from "@/lib/journey-types";
import { DEMO_CHAT_PROMPTS, DEMO_JOURNEY, DEMO_PHOTO_POOL, DEMO_PIPELINE_INPUTS } from "@/lib/demo-data";
import {
  getStoredDemoCapsules,
  getStoredDemoJourneyDraft,
  getStoredDemoPhotoPool,
  storeDemoCapsules,
  storeDemoPhotoPool,
} from "@/lib/demo-session";
import {
  dateKeyToDate,
  resolveDefaultTravelDate,
} from "@/lib/journey-date";
import { compressImageToDataUrl, dataUrlToBlob } from "@/utils/image-upload";
import { ChatTab } from "./journey/chat-tab";
import { GlobalInputBar } from "./journey/global-input-bar";
import { PocketTimeline } from "./journey/pocket-timeline";
import {
  capsuleSearchText,
  fallbackDraft,
  inferredTagsFromName,
  matchPhotos,
  tripTitle,
  uid,
  type ChatMessage,
  type MainTab,
  type PhotoAsset,
} from "./journey/journey-utils";

interface JourneyScreenProps {
  journeyId: string;
}

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "photo.jpg";
}

function imagePayloadFromDataUrl(dataUrl: string, fallbackMimeType = "image/jpeg") {
  const [meta = "", imageBase64 = ""] = dataUrl.split(",");
  const mimeType = meta.match(/^data:([^;]+);base64$/)?.[1] ?? fallbackMimeType;
  return { imageBase64, mimeType };
}

function compactTags(values: Array<string | undefined | null>) {
  return [
    ...new Set(
      values
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(Boolean)
    ),
  ].slice(0, 18);
}

function normalizePhotoAnalysis(result: AnalyzeImageResult) {
  const tags = Array.isArray(result.tags)
    ? result.tags.map((tag) => (typeof tag === "string" ? tag.trim() : "")).filter(Boolean)
    : [];

  return {
    scene: result.scene?.trim(),
    location: result.location?.trim(),
    mood: result.mood?.trim(),
    emotion: result.emotion?.trim(),
    tags,
    suggestedCaption: result.suggestedCaption?.trim(),
  };
}

function sameUrls(a: string[] | null | undefined, b: string[]) {
  const left = a ?? [];
  return left.length === b.length && left.every((url, index) => url === b[index]);
}

function compactPromptLabel(text: string, maxLength = 14) {
  const value = text.trim();
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}…`;
}

const FALLBACK_PROMPT_SUGGESTIONS: PromptSuggestion[] = [
  ...DEMO_CHAT_PROMPTS.map((text) => ({
    intent: "ask" as const,
    label: compactPromptLabel(text),
    text,
  })),
  ...DEMO_PIPELINE_INPUTS.slice(0, 2).map((sample) => ({
    intent: "note" as const,
    label: `记：${sample.label}`,
    text: sample.text,
  })),
];

async function uploadDataUrl(path: string, dataUrl: string) {
  const blob = dataUrlToBlob(dataUrl);
  const uploaded = await storage.upload(path, blob, {
    contentType: blob.type || "application/octet-stream",
  });
  return uploaded.url;
}

export function JourneyScreen({ journeyId }: JourneyScreenProps) {
  const router = useRouter();
  const isDemoMode = journeyId === "demo-journey-izu";

  const [journey, setJourney] = useState<Journey | null>(null);
  const [capsules, setCapsules] = useState<Capsule[]>([]);
  const [photoPool, setPhotoPool] = useState<PhotoAsset[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeTab, setActiveTab] = useState<MainTab>("chat");
  const [activeTravelDate, setActiveTravelDate] = useState("");
  const [selectedPhotoUrls, setSelectedPhotoUrls] = useState<Set<string>>(new Set());
  const [newCapsuleIds, setNewCapsuleIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isAssistantThinking, setIsAssistantThinking] = useState(false);
  const [isComposingNote, setIsComposingNote] = useState(false);
  const [isAnalyzingPhotos, setIsAnalyzingPhotos] = useState(false);
  const [isPocketAwake, setIsPocketAwake] = useState(false);
  const [promptSuggestions, setPromptSuggestions] = useState<PromptSuggestion[]>(FALLBACK_PROMPT_SUGGESTIONS);
  const [isUpdatingPrompts, setIsUpdatingPrompts] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      if (isDemoMode) {
        const draft = getStoredDemoJourneyDraft();
        const storedCapsules = getStoredDemoCapsules();
        const demoJourney = {
          ...DEMO_JOURNEY,
          destination: draft?.destination ?? DEMO_JOURNEY.destination,
          startDate: draft?.startDate ? new Date(draft.startDate) : DEMO_JOURNEY.startDate,
          endDate: draft?.endDate ? new Date(draft.endDate) : DEMO_JOURNEY.endDate,
          description: draft?.importedFrom ? `由 ${draft.importedFrom} 导入` : DEMO_JOURNEY.description,
        } as unknown as Journey;

        setJourney(demoJourney);
        setActiveTravelDate(resolveDefaultTravelDate(demoJourney));
        setCapsules(storedCapsules);
        setPhotoPool([...(DEMO_PHOTO_POOL as PhotoAsset[]), ...getStoredDemoPhotoPool()]);
        setMessages([
          {
            id: "welcome",
            role: "assistant",
            content: `织流已为你锁定「${tripTitle(demoJourney.destination)}」。你可以在这里问计划，也可以按住底部语音记录旅行感受。第一条有效笔记生成后，智能锦囊会自动出现。`,
            timestamp: new Date(),
          },
        ]);
        setIsPocketAwake(storedCapsules.length > 0);
        setIsLoading(false);
        return;
      }

      try {
        const [loadedJourney, loadedCapsules] = await Promise.all([
          getJourneyById(journeyId),
          getJourneyCapsules(journeyId),
        ]);

        setJourney(loadedJourney);
        setActiveTravelDate(resolveDefaultTravelDate(loadedJourney));
        setCapsules(loadedCapsules);
        setMessages([
          {
            id: "welcome",
            role: "assistant",
            content: `织流已为你锁定「${tripTitle(loadedJourney?.destination)}」。可以先问计划，也可以直接按住说话，把现场感受写进 Pocket。`,
            timestamp: new Date(),
          },
        ]);
        setIsPocketAwake(loadedCapsules.length > 0);
      } catch {
        toast.error("加载旅程失败");
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, [journeyId, isDemoMode]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, isAssistantThinking, isComposingNote]);

  const activeDayNumber = 1;
  const visibleCapsules = capsules;

  useEffect(() => {
    if (!journey || isAssistantThinking || isComposingNote) return;

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setIsUpdatingPrompts(true);
      void generatePromptSuggestions({
        destination: journey.destination,
        startDate: journey.startDate,
        endDate: journey.endDate,
        messages: messages.map((message) => ({
          role: message.role,
          content: message.content,
          kind: message.kind,
        })),
        notes: visibleCapsules,
        demoMode: isDemoMode,
        signal: controller.signal,
      })
        .then((suggestions) => {
          if (suggestions.length > 0) setPromptSuggestions(suggestions);
        })
        .catch((error) => {
          if (!(error instanceof DOMException && error.name === "AbortError")) {
            setPromptSuggestions(FALLBACK_PROMPT_SUGGESTIONS);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsUpdatingPrompts(false);
        });
    }, 450);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [journey, messages, visibleCapsules, isDemoMode, isAssistantThinking, isComposingNote]);

  async function streamAssistantReply(userText: string) {
    const assistantId = uid("assistant");
    setMessages((prev) => [
      ...prev,
      {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        streaming: true,
      },
    ]);
    setIsAssistantThinking(true);

    try {
      await streamTravelChat({
        message: userText,
        destination: journey?.destination,
        startDate: journey?.startDate,
        endDate: journey?.endDate,
        notes: visibleCapsules,
        demoMode: isDemoMode,
        onChunk: (text) => {
          setMessages((prev) =>
            prev.map((message) =>
              message.id === assistantId ? { ...message, content: text || "正在整理..." } : message
            )
          );
        },
      });
    } catch {
      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantId
            ? {
                ...message,
                content:
                  "我先按轻量路线帮你整理：把时间留给一个主目的地、一个吃饭点和一段自由散步。你也可以直接按住说话，把现场感受写入 Pocket。",
              }
            : message
        )
      );
    } finally {
      setIsAssistantThinking(false);
      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantId ? { ...message, streaming: false } : message
        )
      );
    }
  }

  function handleAsk(text: string) {
    const value = text.trim();
    if (!value) return;
    setMessages((prev) => [
      ...prev,
      {
        id: uid("user"),
        role: "user",
        content: value,
        timestamp: new Date(),
        kind: "chat",
      },
    ]);
    void streamAssistantReply(value);
  }

  async function createNoteFromTranscript(
    transcript: string,
    audioUrl?: string,
    audioDurationSeconds?: number
  ) {
    const cleanText = transcript.trim();
    if (!cleanText) return;

    setMessages((prev) => [
      ...prev,
      {
        id: uid("voice"),
        role: "user",
        content: cleanText,
        timestamp: new Date(),
        kind: "note",
        audioUrl,
        audioDurationSeconds,
      },
    ]);
    setIsComposingNote(true);

    try {
      let draft = fallbackDraft(cleanText);
      try {
        const generatedDraft = await composeCapsuleDraft({
          userText: cleanText,
          style: "healing",
          demoMode: isDemoMode,
        });
        draft = { ...draft, ...generatedDraft };
      } catch {
        // Keep deterministic fallback draft.
      }

      const manuallySelectedUrls = Array.from(selectedPhotoUrls);
      const matchedPhotos = matchPhotos(cleanText, photoPool, visibleCapsules).filter(
        (photo) => !selectedPhotoUrls.has(photo.url)
      );
      const photoUrls = [...manuallySelectedUrls, ...matchedPhotos.map((photo) => photo.url)].slice(0, 8);
      const now = new Date();
      const travelDate = dateKeyToDate(activeTravelDate);
      const resolvedAudioUrl =
        audioUrl && !isDemoMode
          ? await uploadDataUrl(
              `journeys/${journeyId}/audio/${Date.now()}-${safeFileName("voice.webm")}`,
              audioUrl
            )
          : audioUrl;
      const noteEventType: CapsuleEventType = resolvedAudioUrl
        ? "audio"
        : photoUrls.length > 0
          ? "mixed"
          : "text";
      const capsulePayload = {
        id: uid("demo-live"),
        journeyId,
        userId: "demo-user",
        title: draft.title ?? "旅途片刻",
        location: draft.location ?? "旅途中",
        userRawText: cleanText,
        aiContent: draft.content ?? cleanText,
        aiContentStyle: "healing" as StyleKey,
        eventType: noteEventType,
        audioUrl: resolvedAudioUrl ?? null,
        audioDurationSeconds: resolvedAudioUrl ? audioDurationSeconds ?? null : null,
        keywords: draft.keywords ?? [],
        photoUrls,
        photoCount: photoUrls.length,
        videoUrls: [],
        travelDate,
        dayNumber: activeDayNumber,
        capturedAt: now,
        createdAt: now,
        updatedAt: now,
      } as unknown as Capsule;

      let savedCapsule = capsulePayload;
      if (!isDemoMode) {
        savedCapsule = await createJourneyCapsule(journeyId, {
          title: capsulePayload.title,
          location: capsulePayload.location,
          userRawText: capsulePayload.userRawText,
          aiContent: capsulePayload.aiContent,
          keywords: capsulePayload.keywords,
          eventType: noteEventType,
          audioUrl: capsulePayload.audioUrl,
          audioDurationSeconds: capsulePayload.audioDurationSeconds,
          photoUrls,
          videoUrls: [],
          travelDate: activeTravelDate,
          dayNumber: activeDayNumber,
        });
      }

      setCapsules((prev) => {
        const next = [...prev, savedCapsule];
        if (isDemoMode) storeDemoCapsules(next);
        return next;
      });
      setNewCapsuleIds((prev) => new Set([...prev, savedCapsule.id]));
      setSelectedPhotoUrls(new Set());
      setIsPocketAwake(true);
      setMessages((prev) => [
        ...prev,
        {
          id: uid("assistant-note"),
          role: "assistant",
          content: photoUrls.length
            ? manuallySelectedUrls.length
              ? `已写入 Pocket，并关联了 ${manuallySelectedUrls.length} 张你手选的照片。`
              : `已写入 Pocket，并从今日照片池里匹配了 ${photoUrls.length} 张相关素材。`
            : "已写入 Pocket。当前没有找到强相关照片，所以先保留为留白卡片，后续导入相册后可以继续匹配。",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsComposingNote(false);
    }
  }

  async function rematchExistingCapsules(nextPhotoPool: PhotoAsset[]) {
    if (capsules.length === 0) return 0;

    const changes = capsules
      .map((capsule) => {
        const matchedUrls = matchPhotos(capsuleSearchText(capsule), nextPhotoPool, capsules, {
          currentCapsuleId: capsule.id,
        })
          .map((photo) => photo.url)
          .slice(0, 8);

        if (matchedUrls.length === 0 || sameUrls(capsule.photoUrls, matchedUrls)) {
          return null;
        }

        return { capsule, photoUrls: matchedUrls };
      })
      .filter(Boolean) as Array<{ capsule: Capsule; photoUrls: string[] }>;

    if (changes.length === 0) return 0;

    if (isDemoMode) {
      const changedById = new Map(changes.map((change) => [change.capsule.id, change.photoUrls]));
      const nextCapsules = capsules.map((capsule) => {
        const nextPhotoUrls = changedById.get(capsule.id);
        return nextPhotoUrls
          ? {
              ...capsule,
              photoUrls: nextPhotoUrls,
              photoCount: nextPhotoUrls.length,
              updatedAt: new Date(),
            }
          : capsule;
      });
      setCapsules(nextCapsules);
      storeDemoCapsules(nextCapsules);
      return changes.length;
    }

    const updated = (
      await Promise.all(
        changes.map((change) =>
          updateCapsule(change.capsule.id, { photoUrls: change.photoUrls }).catch(() => null)
        )
      )
    ).filter(Boolean) as Capsule[];

    if (updated.length > 0) {
      const updatedById = new Map(updated.map((capsule) => [capsule.id, capsule]));
      setCapsules((prev) => prev.map((capsule) => updatedById.get(capsule.id) ?? capsule));
    }

    if (updated.length < changes.length) {
      toast.error("部分旧笔记重新配图失败，请稍后再试");
    }

    return updated.length;
  }

  async function handlePhotoImport(files: File[]) {
    if (files.length === 0) return;
    setIsAnalyzingPhotos(true);

    try {
      const mediaFiles = files.slice(0, 18);
      const imageFiles = mediaFiles.filter((file) => file.type.startsWith("image/"));
      const videoFiles = mediaFiles.filter((file) => file.type.startsWith("video/"));

      const imported = (
        await Promise.all(
          imageFiles.map(async (file, index) => {
            try {
              const dataUrl = await compressImageToDataUrl(file);
              const label = file.name.replace(/\.[^.]+$/, "");
              const imagePayload = imagePayloadFromDataUrl(dataUrl, file.type || "image/jpeg");
              let url = dataUrl;
              let aiAnalysis: PhotoAsset["aiAnalysis"] | undefined;
              let analysisStatus: PhotoAsset["analysisStatus"] = "failed";

              try {
                aiAnalysis = normalizePhotoAnalysis(
                  await analyzeImage({
                    ...imagePayload,
                    fileName: file.name,
                    demoMode: isDemoMode,
                  })
                );
                analysisStatus = "ready";
              } catch {
                analysisStatus = "failed";
              }

              if (!isDemoMode) {
                const blob = dataUrlToBlob(dataUrl);
                const uploaded = await storage.upload(
                  `journeys/${journeyId}/photos/${Date.now()}-${index}-${safeFileName(file.name)}`,
                  blob,
                  { contentType: blob.type || "image/jpeg" }
                );
                url = uploaded.url;
              }

              return {
                id: uid(`upload-${index}`),
                url,
                label,
                tags: compactTags([
                  ...inferredTagsFromName(label),
                  ...(aiAnalysis?.tags ?? []),
                  aiAnalysis?.scene,
                  aiAnalysis?.location,
                  aiAnalysis?.mood,
                  aiAnalysis?.emotion,
                  aiAnalysis?.suggestedCaption,
                ]),
                location: aiAnalysis?.location || undefined,
                source: "upload" as const,
                capturedAt: new Date(file.lastModified || Date.now()).toISOString(),
                aiAnalysis,
                analysisStatus,
              };
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "图片处理失败");
              return null;
            }
          })
        )
      ).filter(Boolean) as PhotoAsset[];

      const videoUrls = (
        await Promise.all(
          videoFiles.slice(0, 4).map(async (file, index) => {
            try {
              if (isDemoMode) return URL.createObjectURL(file);
              const uploaded = await storage.upload(
                `journeys/${journeyId}/videos/${Date.now()}-${index}-${safeFileName(file.name)}`,
                file,
                { contentType: file.type || "video/mp4" }
              );
              return uploaded.url;
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "视频处理失败");
              return null;
            }
          })
        )
      ).filter(Boolean) as string[];

      if (imported.length === 0 && videoUrls.length === 0) return;

      const nextPhotoPool = [...photoPool, ...imported];
      setPhotoPool(nextPhotoPool);
      if (isDemoMode) storeDemoPhotoPool(nextPhotoPool);
      setIsPocketAwake(true);

      const photoUrls = imported.map((photo) => photo.url);
      const now = new Date();
      const mediaEventType: CapsuleEventType =
        photoUrls.length > 0 && videoUrls.length > 0
          ? "mixed"
          : videoUrls.length > 0
            ? "video"
            : "photo";
      const mediaCapsulePayload = {
        id: uid("demo-live-media"),
        journeyId,
        userId: "demo-user",
        title:
          mediaEventType === "video"
            ? "导入的视频片段"
            : mediaEventType === "photo"
              ? "导入的照片素材"
              : "导入的现场素材",
        location: journey?.destination ?? "旅途中",
        userRawText: "",
        aiContent: "",
        aiContentStyle: "healing" as StyleKey,
        eventType: mediaEventType,
        audioUrl: null,
        audioDurationSeconds: null,
        keywords: compactTags([
          "素材",
          "照片",
          "视频",
          ...imported.flatMap((photo) => photo.tags ?? []),
        ]).slice(0, 8),
        photoUrls,
        photoCount: photoUrls.length,
        videoUrls,
        travelDate: dateKeyToDate(activeTravelDate),
        dayNumber: activeDayNumber,
        capturedAt: now,
        createdAt: now,
        updatedAt: now,
      } as unknown as Capsule;

      let savedMediaCapsule = mediaCapsulePayload;
      if (!isDemoMode) {
        savedMediaCapsule = await createJourneyCapsule(journeyId, {
          title: mediaCapsulePayload.title,
          location: mediaCapsulePayload.location,
          userRawText: null,
          aiContent: null,
          keywords: mediaCapsulePayload.keywords,
          eventType: mediaEventType,
          photoUrls,
          videoUrls,
          travelDate: activeTravelDate,
          dayNumber: activeDayNumber,
        });
      }

      setCapsules((prev) => {
        const next = [...prev, savedMediaCapsule];
        if (isDemoMode) storeDemoCapsules(next);
        return next;
      });
      setNewCapsuleIds((prev) => new Set([...prev, savedMediaCapsule.id]));

      const rematchedCount = await rematchExistingCapsules(nextPhotoPool);
      const analyzedCount = imported.filter((photo) => photo.analysisStatus === "ready").length;
      toast.success(
        `已导入 ${imported.length} 张照片${videoUrls.length ? `、${videoUrls.length} 段视频` : ""}，AI 已识别 ${analyzedCount} 张${
          rematchedCount > 0 ? `，并为 ${rematchedCount} 条旧笔记重新配图` : ""
        }`
      );

      if (rematchedCount > 0) {
        setMessages((prev) => [
          ...prev,
          {
            id: uid("assistant-rematch"),
            role: "assistant",
            content: `新照片已经逐张识别，并自动为 ${rematchedCount} 条已有笔记重新匹配了照片。`,
            timestamp: new Date(),
          },
        ]);
      }
    } finally {
      setIsAnalyzingPhotos(false);
    }
  }

  function toggleSelectedPhoto(url: string) {
    setSelectedPhotoUrls((prev) => {
      const next = new Set(prev);
      if (next.has(url)) {
        next.delete(url);
      } else if (next.size < 8) {
        next.add(url);
      } else {
        toast.info("最多关联 8 张照片");
      }
      return next;
    });
  }

  if (isLoading) {
    return (
      <div className="journey-shell journey-ambient flex min-h-svh items-center justify-center text-slate-500">
        <div className="journey-liquid-glass flex flex-col items-center gap-4 rounded-[28px] px-8 py-7">
          <Loader2 className="animate-spin" />
          <p className="text-xs font-semibold tracking-[0.18em]">OPENING JOURNEY</p>
        </div>
      </div>
    );
  }

  return (
    <main className="journey-shell journey-ambient relative flex h-svh flex-col overflow-hidden text-slate-800">
      <header className="z-30 shrink-0 px-6 pt-[max(env(safe-area-inset-top),16px)]">
        <div className="mx-auto max-w-[430px]">
          <div className="flex h-12 items-center justify-between">
            <button
              onClick={() => router.push("/")}
              className="journey-liquid-glass flex h-9 w-9 items-center justify-center rounded-full text-slate-500"
              aria-label="返回"
            >
              <ArrowLeft size={17} />
            </button>
            <div className="min-w-0 text-center">
              <h1 className="truncate text-[15px] font-semibold text-slate-800">
                {tripTitle(journey?.destination)}
              </h1>
              <p className="mt-0.5 text-[11px] font-medium text-slate-400">今日手账</p>
            </div>
            <div className="h-9 w-9" />
          </div>

          <div className="mt-4 flex w-full items-center justify-center text-[17px] font-medium text-slate-400">
            <button
              onClick={() => setActiveTab("chat")}
              className={`border-b-2 px-8 py-2 transition-colors ${
                activeTab === "chat"
                  ? "border-slate-900/40 text-slate-900"
                  : "border-transparent text-slate-400"
              }`}
            >
              Chat
            </button>
            <button
              onClick={() => setActiveTab("timeline")}
              className={`border-b-2 px-8 py-2 transition-colors ${
                activeTab === "timeline"
                  ? "border-slate-900/40 text-slate-900"
                  : "border-transparent text-slate-400"
              }`}
            >
              Pocket
              {isPocketAwake && <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-slate-900/50" />}
            </button>
          </div>
          <div className="h-px w-full bg-slate-200/50" />
        </div>
      </header>

      <AnimatePresence mode="wait">
        {activeTab === "chat" ? (
          <motion.section
            key="chat"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            className="journey-no-scrollbar mx-auto w-full max-w-[430px] flex-1 overflow-y-auto px-4 pb-64 pt-6"
          >
            <ChatTab
              messages={messages}
              isAssistantThinking={isAssistantThinking}
              isComposingNote={isComposingNote}
            />
            <div ref={chatBottomRef} />
          </motion.section>
        ) : (
          <motion.section
            key="timeline"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            className="journey-no-scrollbar mx-auto w-full max-w-[430px] flex-1 overflow-y-auto px-0 pb-64 pt-6"
          >
            <PocketTimeline
              journey={journey}
              capsules={visibleCapsules}
              photoPool={photoPool}
              selectedPhotoUrls={selectedPhotoUrls}
              newCapsuleIds={newCapsuleIds}
              isComposingNote={isComposingNote}
              isAnalyzingPhotos={isAnalyzingPhotos}
              onImportPhotos={(files) => void handlePhotoImport(files)}
              onTogglePhotoSelection={toggleSelectedPhoto}
              onOpenCanvas={() => router.push(`/daily-canvas/${journeyId}`)}
            />
          </motion.section>
        )}
      </AnimatePresence>

      <GlobalInputBar
        activeTab={activeTab}
        selectedPhotoCount={selectedPhotoUrls.size}
        promptSuggestions={promptSuggestions}
        isUpdatingPrompts={isUpdatingPrompts}
        onAsk={handleAsk}
        onVoiceNote={(text, audioUrl, audioDurationSeconds) =>
          void createNoteFromTranscript(text, audioUrl, audioDurationSeconds)
        }
        onImportPhotos={(files) => void handlePhotoImport(files)}
      />
    </main>
  );
}
