"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpenCheck,
  CalendarDays,
  Camera,
  ChevronRight,
  ImagePlus,
  Keyboard,
  Loader2,
  Mic,
  Package,
  Play,
  Send,
  Sparkles,
  Square,
} from "lucide-react";
import { toast } from "sonner";
import { request } from "@/lib/api/request";
import type { Capsule, Journey, StyleKey } from "@/lib/journey-types";
import {
  DEMO_CHAT_PROMPTS,
  DEMO_JOURNEY,
  DEMO_PHOTO_POOL,
  DEMO_PIPELINE_INPUTS,
} from "@/lib/demo-data";
import {
  type DemoPhotoAsset,
  getStoredDemoCapsules,
  getStoredDemoJourneyDraft,
  getStoredDemoPhotoPool,
  storeDemoCapsules,
  storeDemoPhotoPool,
} from "@/lib/demo-session";

interface JourneyScreenProps {
  journeyId: string;
}

type MainTab = "chat" | "timeline";
type ChatRole = "assistant" | "user";
type ChatKind = "chat" | "note";
type PhotoAsset = DemoPhotoAsset;

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: Date;
  kind?: ChatKind;
  audioUrl?: string;
  streaming?: boolean;
}

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

const MATCH_RULES = [
  {
    key: "bamboo",
    aliases: ["修善寺", "竹林", "竹林小径", "小径", "溪水", "雨后", "石板", "治愈", "bamboo", "path", "shuzenji"],
    photoHints: ["bamboo", "shuzenji", "竹林", "修善寺", "小径"],
  },
  {
    key: "onsen",
    aliases: ["温泉", "旅馆", "白雾", "榻榻米", "疲惫", "泡汤", "onsen", "steam", "ryokan"],
    photoHints: ["onsen", "steam", "温泉", "旅馆", "白雾"],
  },
  {
    key: "coast",
    aliases: ["伊豆", "海边", "海岸", "海浪", "海风", "岩石", "峭壁", "灯塔", "波光", "coast", "sea", "waves"],
    photoHints: ["izu", "coast", "sea", "waves", "海岸", "海浪", "伊豆"],
  },
  {
    key: "sushi",
    aliases: ["筑地", "寿司", "金枪鱼", "大腹", "山葵", "市场", "早餐", "美食", "sushi", "tuna", "food"],
    photoHints: ["sushi", "tuna", "food", "筑地", "寿司", "金枪鱼"],
  },
  {
    key: "tokyo-night",
    aliases: ["东京", "新宿", "霓虹", "夜景", "夜晚", "雨夜", "积水", "倒影", "电影", "neon", "night", "tokyo", "shinjuku", "rain"],
    photoHints: ["tokyo", "shinjuku", "neon", "night", "rain", "新宿", "霓虹", "雨夜"],
  },
  {
    key: "shrine",
    aliases: ["神社", "灯笼", "红色", "夜灯", "安静", "仪式感", "shrine", "lantern"],
    photoHints: ["shrine", "lantern", "神社", "灯笼"],
  },
];

const SCENE_TITLES: Record<string, string> = {
  bamboo: "竹林慢放时刻",
  onsen: "温泉白雾归处",
  coast: "伊豆海风片刻",
  sushi: "筑地美食记忆",
  "tokyo-night": "新宿霓虹片尾",
  shrine: "神社夜灯",
};

function dateText(value: unknown) {
  if (!value) return "";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
}

function timeText(value: unknown) {
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

function tripTitle(destination?: string | null) {
  if (!destination) return "旅途中";
  if (destination.includes("日本")) return destination;
  return destination;
}

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalize(value: unknown) {
  return String(value ?? "").toLowerCase();
}

function includesAny(text: string, terms: string[]) {
  const normalized = normalize(text);
  return terms.some((term) => normalized.includes(normalize(term)));
}

function hitCount(text: string, terms: string[]) {
  const normalized = normalize(text);
  return terms.reduce((count, term) => (normalized.includes(normalize(term)) ? count + 1 : count), 0);
}

function photoBlob(photo: PhotoAsset) {
  return [photo.url, photo.label, photo.location, ...(photo.tags ?? [])].join(" ");
}

function parseJSONPayload(text: string) {
  const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  return JSON.parse(match?.[0] ?? cleaned) as {
    title?: string;
    location?: string;
    keywords?: string[];
    content?: string;
  };
}

function detectScene(text: string) {
  return MATCH_RULES.find((rule) => includesAny(text, rule.aliases));
}

function fallbackDraft(text: string) {
  const scene = detectScene(text);
  const title = scene ? SCENE_TITLES[scene.key] : "旅途片刻";
  const keywords = MATCH_RULES.flatMap((rule) => rule.aliases)
    .filter((keyword) => keyword.length <= 5 && includesAny(text, [keyword]))
    .slice(0, 5);

  return {
    title,
    location: scene?.aliases.find((item) => item.length >= 2 && !/[a-z]/i.test(item)) ?? "旅途中",
    keywords: keywords.length ? keywords : ["旅行", "现场", "感受"],
    content: text.length > 92 ? `${text.slice(0, 92)}...` : text,
  };
}

function photoScore(photo: PhotoAsset, text: string, index: number, capsules: Capsule[]) {
  const blob = photoBlob(photo);
  const used = capsules.some((capsule) => (capsule.photoUrls ?? []).includes(photo.url));
  let score = 0;

  for (const rule of MATCH_RULES) {
    const textHits = hitCount(text, rule.aliases);
    const photoHits = hitCount(blob, [...rule.photoHints, ...rule.aliases]);
    if (textHits > 0 && photoHits > 0) {
      score += 34 + textHits * 5 + photoHits * 2;
    }
  }

  score += (photo.tags ?? []).reduce((sum, tag) => (includesAny(text, [tag]) ? sum + 8 : sum), 0);
  if (photo.location && includesAny(text, [photo.location])) score += 12;
  if (photo.isRetouched && score > 0) score += 3;
  if (used && score > 0) score -= 8;

  return score - index * 0.04;
}

function matchPhotos(text: string, photoPool: PhotoAsset[], capsules: Capsule[]) {
  return photoPool
    .map((photo, index) => ({ photo, score: photoScore(photo, text, index, capsules) }))
    .filter((item) => item.score >= 18)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((item) => item.photo);
}

function inferredTagsFromName(label: string) {
  const tokens = label.split(/[\s._-]+/).filter(Boolean);
  const inferred = MATCH_RULES.flatMap((rule) =>
    includesAny(label, [...rule.photoHints, rule.key]) ? rule.aliases.slice(0, 7) : []
  );
  return [...new Set([...tokens, ...inferred, "照片", "相册", "旅行"])];
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getSpeechRecognition() {
  if (typeof window === "undefined") return null;
  const scopedWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  const Ctor = scopedWindow.SpeechRecognition ?? scopedWindow.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

export function JourneyScreen({ journeyId }: JourneyScreenProps) {
  const router = useRouter();
  const isDemoMode = journeyId === "demo-journey-izu";

  const [journey, setJourney] = useState<Journey | null>(null);
  const [capsules, setCapsules] = useState<Capsule[]>([]);
  const [photoPool, setPhotoPool] = useState<PhotoAsset[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeTab, setActiveTab] = useState<MainTab>("chat");
  const [newCapsuleIds, setNewCapsuleIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isAssistantThinking, setIsAssistantThinking] = useState(false);
  const [isComposingNote, setIsComposingNote] = useState(false);
  const [isPocketAwake, setIsPocketAwake] = useState(false);
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
        const [journeyRes, capsulesRes] = await Promise.all([
          request(`/api/journeys?id=${journeyId}`),
          request(`/api/journeys/${journeyId}/capsules`),
        ]);

        const loadedJourney = journeyRes.ok ? ((await journeyRes.json()) as Journey | null) : null;
        const loadedCapsules = capsulesRes.ok ? ((await capsulesRes.json()) as Capsule[]) : [];

        setJourney(loadedJourney);
        setCapsules(loadedCapsules);
        setMessages([
          {
            id: "welcome",
            role: "assistant",
            content: `织流已为你锁定「${tripTitle(loadedJourney?.destination)}」。可以先问计划，也可以直接按住说话，把现场感受写进时间线。`,
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

  const startDate = dateText(journey?.startDate);
  const endDate = dateText(journey?.endDate);
  const dateRange = startDate && endDate ? `${startDate} - ${endDate}` : "今日旅程";

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
      const res = await fetch("/api/ai/travel-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          destination: journey?.destination,
          startDate: journey?.startDate,
          endDate: journey?.endDate,
          notes: capsules,
          demoMode: isDemoMode,
        }),
      });

      if (!res.ok || !res.body) throw new Error("chat failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantId ? { ...message, content: text || "正在整理..." } : message
          )
        );
      }
    } catch {
      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantId
            ? {
                ...message,
                content:
                  "我先按轻量路线帮你整理：把时间留给一个主目的地、一个吃饭点和一段自由散步。你也可以直接按住说话，把现场感受写入时间线。",
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

  async function createNoteFromTranscript(transcript: string, audioUrl?: string) {
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
      },
    ]);
    setIsComposingNote(true);

    try {
      let draft = fallbackDraft(cleanText);
      try {
        const composeRes = await fetch("/api/ai/compose", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userText: cleanText, style: "healing", demoMode: isDemoMode }),
        });
        if (composeRes.ok) {
          const rawText = await composeRes.text();
          draft = { ...draft, ...parseJSONPayload(rawText) };
        }
      } catch {
        // Keep deterministic fallback draft.
      }

      const matchedPhotos = matchPhotos(cleanText, photoPool, capsules);
      const photoUrls = matchedPhotos.map((photo) => photo.url);
      const now = new Date();
      const capsulePayload = {
        id: uid("demo-live"),
        journeyId,
        userId: "demo-user",
        title: draft.title ?? "旅途片刻",
        location: draft.location ?? "旅途中",
        userRawText: cleanText,
        aiContent: draft.content ?? cleanText,
        aiContentStyle: "healing" as StyleKey,
        keywords: draft.keywords ?? [],
        photoUrls,
        photoCount: photoUrls.length,
        capturedAt: now,
        createdAt: now,
        updatedAt: now,
      } as unknown as Capsule;

      let savedCapsule = capsulePayload;
      if (!isDemoMode) {
        const res = await request(`/api/journeys/${journeyId}/capsules`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: capsulePayload.title,
            location: capsulePayload.location,
            userRawText: capsulePayload.userRawText,
            aiContent: capsulePayload.aiContent,
            keywords: capsulePayload.keywords,
            photoUrls,
          }),
        });
        if (res.ok) savedCapsule = (await res.json()) as Capsule;
      }

      setCapsules((prev) => {
        const next = [...prev, savedCapsule];
        if (isDemoMode) storeDemoCapsules(next);
        return next;
      });
      setNewCapsuleIds((prev) => new Set([...prev, savedCapsule.id]));
      setIsPocketAwake(true);
      setMessages((prev) => [
        ...prev,
        {
          id: uid("assistant-note"),
          role: "assistant",
          content: photoUrls.length
            ? `已写入时间线，并从今日照片池里匹配了 ${photoUrls.length} 张相关素材。点底部的智能锦囊可以查看手账草稿。`
            : "已写入时间线。当前没有找到强相关照片，所以先保留为留白卡片，后续导入相册后可以继续匹配。",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsComposingNote(false);
    }
  }

  async function handlePhotoImport(files: File[]) {
    if (files.length === 0) return;
    const imported = await Promise.all(
      files.slice(0, 18).map(async (file, index) => {
        const dataUrl = await fileToDataUrl(file);
        const label = file.name.replace(/\.[^.]+$/, "");
        return {
          id: uid(`upload-${index}`),
          url: dataUrl,
          label,
          tags: inferredTagsFromName(label),
          source: "upload" as const,
          capturedAt: new Date(file.lastModified || Date.now()).toISOString(),
        };
      })
    );

    setPhotoPool((prev) => {
      const next = [...prev, ...imported];
      if (isDemoMode) storeDemoPhotoPool(next);
      return next;
    });
    setIsPocketAwake(true);
    toast.success(`已导入 ${imported.length} 张照片，后续笔记会按语义挑图`);
  }

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-[#F7F1E8]">
        <div className="flex flex-col items-center gap-4 text-[#8B8174]">
          <Loader2 className="animate-spin" />
          <p className="text-xs font-semibold tracking-[0.18em]">正在打开旅程</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-svh bg-[#F7F1E8] text-[#1E1712]">
      <header className="sticky top-0 z-30 border-b border-[#DED1BD] bg-[#F7F1E8]/95 px-5 pb-0 pt-8 backdrop-blur">
        <div className="mx-auto max-w-[430px]">
          <div className="mb-6 flex items-center justify-between">
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-1 text-sm font-semibold text-[#C86B4A]"
            >
              <ArrowLeft size={18} />
              返回
            </button>
            <div className="text-center">
              <h1 className="text-xl font-black">{tripTitle(journey?.destination)}</h1>
              <p className="mt-1 text-[11px] font-medium text-[#8B8174]">{dateRange}</p>
            </div>
            <button
              onClick={() => setActiveTab("timeline")}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E8DDCB] text-[#C86B4A]"
              aria-label="打开智能锦囊"
            >
              <Package size={18} />
            </button>
          </div>

          <div className="grid grid-cols-2 text-base font-semibold">
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex items-center justify-center gap-2 border-b-[3px] pb-3 transition-colors ${
                activeTab === "chat"
                  ? "border-[#C86B4A] text-[#C86B4A]"
                  : "border-transparent text-[#8B8174]"
              }`}
            >
              聊天
            </button>
            <button
              onClick={() => setActiveTab("timeline")}
              className={`flex items-center justify-center gap-2 border-b-[3px] pb-3 transition-colors ${
                activeTab === "timeline"
                  ? "border-[#C86B4A] text-[#C86B4A]"
                  : "border-transparent text-[#8B8174]"
              }`}
            >
              <CalendarDays size={18} />
              时间线
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {activeTab === "chat" ? (
          <motion.section
            key="chat"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            className="mx-auto max-w-[430px] px-5 pb-[220px] pt-7"
          >
            <ChatTab
              messages={messages}
              isAssistantThinking={isAssistantThinking}
              isComposingNote={isComposingNote}
              onAsk={handleAsk}
              onNote={(text) => void createNoteFromTranscript(text)}
            />
            <div ref={chatBottomRef} />
          </motion.section>
        ) : (
          <motion.section
            key="timeline"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            className="mx-auto max-w-[430px] px-5 pb-[220px] pt-6"
          >
            <PocketTimeline
              journey={journey}
              capsules={capsules}
              photoPool={photoPool}
              newCapsuleIds={newCapsuleIds}
              isComposingNote={isComposingNote}
              onImportPhotos={(files) => void handlePhotoImport(files)}
              onOpenCanvas={() => router.push(`/daily-canvas/${journeyId}`)}
            />
          </motion.section>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isPocketAwake && activeTab === "chat" && (
          <motion.button
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 18 }}
            onClick={() => setActiveTab("timeline")}
            className="fixed left-1/2 z-40 flex w-[min(380px,calc(100vw-40px))] -translate-x-1/2 items-center justify-between rounded-t-[24px] border border-[#D9CCB8] bg-[#FFF9EF] px-5 py-3 text-left shadow-[0_-10px_30px_rgba(64,45,25,0.10)]"
            style={{ bottom: "calc(env(safe-area-inset-bottom) + 94px)" }}
          >
            <span className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E8DDCB] text-[#C86B4A]">
                <Package size={17} />
              </span>
              <span>
                <span className="block text-sm font-black">智能锦囊</span>
                <span className="block text-[11px] text-[#8B8174]">
                  {capsules.length ? `${capsules.length} 条笔记已沉淀` : "照片池已准备好"}
                </span>
              </span>
            </span>
            <ChevronRight size={18} className="text-[#C86B4A]" />
          </motion.button>
        )}
      </AnimatePresence>

      <GlobalInputBar
        demoMode={isDemoMode}
        activeTab={activeTab}
        onAsk={handleAsk}
        onVoiceNote={(text, audioUrl) => void createNoteFromTranscript(text, audioUrl)}
        onImportPhotos={(files) => void handlePhotoImport(files)}
      />
    </main>
  );
}

function ChatTab({
  messages,
  isAssistantThinking,
  isComposingNote,
  onAsk,
  onNote,
}: {
  messages: ChatMessage[];
  isAssistantThinking: boolean;
  isComposingNote: boolean;
  onAsk: (text: string) => void;
  onNote: (text: string) => void;
}) {
  return (
    <div className="space-y-5">
      {messages.map((message) => (
        <motion.article
          key={message.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-[82%] rounded-[24px] px-5 py-4 shadow-[0_10px_26px_rgba(64,45,25,0.08)] ${
              message.role === "user"
                ? "bg-[#C86B4A] text-white"
                : "border border-[#E4D8C7] bg-[#FFFBF4] text-[#1E1712]"
            }`}
          >
            <p className="whitespace-pre-wrap text-[17px] font-medium leading-[1.65] tracking-normal">
              {message.content || "正在整理..."}
            </p>
            <div
              className={`mt-3 flex items-center justify-between gap-3 text-xs ${
                message.role === "user" ? "text-white/72" : "text-[#B2A693]"
              }`}
            >
              <span>{timeText(message.timestamp)}</span>
              {message.kind === "note" && (
                <span className="flex items-center gap-1">
                  <BookOpenCheck size={13} />
                  已记入
                </span>
              )}
              {message.audioUrl && (
                <button
                  onClick={() => new Audio(message.audioUrl).play().catch(() => {})}
                  className="flex items-center gap-1"
                >
                  <Play size={13} />
                  原声
                </button>
              )}
            </div>
          </div>
        </motion.article>
      ))}

      {(isAssistantThinking || isComposingNote) && (
        <div className="flex items-center gap-2 text-xs font-semibold text-[#C86B4A]">
          <Loader2 size={14} className="animate-spin" />
          {isComposingNote ? "正在为笔记匹配照片..." : "旅行助手正在整理..."}
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-2 pt-1" style={{ scrollbarWidth: "none" }}>
        {DEMO_CHAT_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onAsk(prompt)}
            className="shrink-0 rounded-full border border-[#D9CCB8] bg-[#EFE7D8] px-4 py-2 text-sm font-semibold text-[#7B6F61]"
          >
            {prompt}
          </button>
        ))}
        {DEMO_PIPELINE_INPUTS.slice(0, 3).map((sample) => (
          <button
            key={sample.label}
            onClick={() => onNote(sample.text)}
            className="shrink-0 rounded-full border border-[#E2C5B7] bg-[#FFF4EA] px-4 py-2 text-sm font-semibold text-[#C86B4A]"
          >
            记：{sample.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function PocketTimeline({
  journey,
  capsules,
  photoPool,
  newCapsuleIds,
  isComposingNote,
  onImportPhotos,
  onOpenCanvas,
}: {
  journey: Journey | null;
  capsules: Capsule[];
  photoPool: PhotoAsset[];
  newCapsuleIds: Set<string>;
  isComposingNote: boolean;
  onImportPhotos: (files: File[]) => void;
  onOpenCanvas: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const photosByUrl = useMemo(() => new Map(photoPool.map((photo) => [photo.url, photo])), [photoPool]);

  return (
    <div className="relative border-l border-[#D8CBB7] pl-5">
      <div className="absolute -left-[5px] top-2 h-3 w-3 rounded-full bg-[#C86B4A]" />
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black">Day 1 · {journey?.destination ?? "旅途中"}</h2>
          <p className="mt-1 text-sm text-[#8B8174]">
            {dateText(journey?.startDate) || "今天"} · {photoPool.length} 张候选照片
          </p>
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#D9CCB8] bg-[#FFF9EF] text-[#C86B4A]"
          aria-label="导入相册照片"
        >
          <ImagePlus size={20} />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.currentTarget.value = "";
            onImportPhotos(files);
          }}
        />
      </div>

      {capsules.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-[#D9CCB8] bg-[#FFF9EF] p-6 text-center">
          <Camera className="mx-auto mb-4 text-[#C86B4A]" />
          <p className="text-base font-black">还没有旅行笔记</p>
          <p className="mt-2 text-sm leading-6 text-[#8B8174]">
            回到聊天页按住说话，或先导入今日相册。第一条笔记生成后，智能锦囊会自动常驻。
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {capsules.map((capsule, index) => {
            const matchedPhotos = (capsule.photoUrls ?? [])
              .map((url) => photosByUrl.get(url))
              .filter(Boolean) as PhotoAsset[];
            return (
              <motion.article
                key={capsule.id}
                initial={newCapsuleIds.has(capsule.id) ? { opacity: 0, y: 16, scale: 0.97 } : false}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="relative"
              >
                <div className="absolute -left-[27px] top-2 h-3 w-3 rounded-full bg-[#C86B4A]" />
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-lg font-black">
                    Moment {index + 1} · {capsule.title}
                  </h3>
                  <span className="text-sm text-[#8B8174]">{timeText(capsule.capturedAt)}</span>
                </div>

                <div className="overflow-hidden rounded-[24px] bg-[#EFE7D8] shadow-[0_14px_36px_rgba(64,45,25,0.10)]">
                  {capsule.photoUrls && capsule.photoUrls.length > 0 ? (
                    <div className="grid grid-cols-3 gap-1 p-1">
                      {capsule.photoUrls.slice(0, 5).map((url, photoIndex) => {
                        const photo = photosByUrl.get(url);
                        return (
                          <div
                            key={url}
                            className={`relative overflow-hidden bg-[#DED1BD] ${
                              photoIndex === 0 ? "col-span-2 row-span-2 aspect-square" : "aspect-square"
                            }`}
                          >
                            <img src={url} alt="" className="h-full w-full object-cover" />
                            {photo?.isRetouched && (
                              <span className="absolute right-2 top-2 rounded-full bg-[#C86B4A] px-2 py-1 text-[11px] font-black text-white">
                                精修
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex aspect-[4/3] items-center justify-center bg-[#DED1BD] px-8 text-center text-sm leading-6 text-[#8B8174]">
                      没有强相关照片，先作为途中的留白卡片。
                    </div>
                  )}

                  <div className="space-y-3 px-5 py-4">
                    <p className="text-[16px] font-medium leading-7 text-[#5F5549]">
                      {capsule.aiContent || capsule.userRawText}
                    </p>
                    {capsule.userRawText && (
                      <p className="rounded-[18px] bg-[#FFF9EF] px-4 py-3 text-sm leading-6 text-[#7B6F61]">
                        “{capsule.userRawText}”
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {(capsule.keywords ?? []).slice(0, 4).map((keyword) => (
                        <span
                          key={keyword}
                          className="rounded-full bg-[#FFF9EF] px-3 py-1 text-xs font-semibold text-[#C86B4A]"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                    {matchedPhotos.length > 0 && (
                      <p className="text-xs font-semibold text-[#8B8174]">
                        已从照片池匹配：{matchedPhotos.map((photo) => photo.label).join("、")}
                      </p>
                    )}
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}

      {isComposingNote && (
        <div className="mt-6 flex items-center gap-2 rounded-[18px] bg-[#FFF4EA] px-4 py-3 text-sm font-semibold text-[#C86B4A]">
          <Loader2 size={15} className="animate-spin" />
          正在翻阅相册并编排时间线...
        </div>
      )}

      {capsules.length > 0 && (
        <button
          onClick={onOpenCanvas}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-[22px] bg-[#1E1712] px-5 py-4 text-base font-black text-white"
        >
          <Sparkles size={18} />
          生成今日手账
        </button>
      )}
    </div>
  );
}

function GlobalInputBar({
  demoMode,
  activeTab,
  onAsk,
  onVoiceNote,
  onImportPhotos,
}: {
  demoMode: boolean;
  activeTab: MainTab;
  onAsk: (text: string) => void;
  onVoiceNote: (text: string, audioUrl?: string) => void;
  onImportPhotos: (files: File[]) => void;
}) {
  const [text, setText] = useState("");
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const transcriptRef = useRef("");

  async function startRecording() {
    if (isRecording) return;
    setIsRecording(true);
    setLiveTranscript("");
    transcriptRef.current = "";
    chunksRef.current = [];

    const recognition = getSpeechRecognition();
    if (recognition) {
      recognition.lang = "zh-CN";
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0]?.transcript ?? "")
          .join("");
        transcriptRef.current = transcript;
        setLiveTranscript(transcript);
      };
      recognition.onerror = () => {};
      recognition.onend = () => {};
      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch {
        recognitionRef.current = null;
      }
    }

    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        throw new Error("media recorder unavailable");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const audioUrl = blob.size > 0 ? URL.createObjectURL(blob) : undefined;
        const finalText = (transcriptRef.current || text).trim();
        finishRecording(finalText, audioUrl);
      };
      recorderRef.current = recorder;
      recorder.start();
    } catch {
      setIsRecording(false);
      recognitionRef.current?.abort?.();
      toast.info("当前浏览器无法录音，可以输入文字后点“记为笔记”。");
    }
  }

  function finishRecording(finalText: string, audioUrl?: string) {
    setIsRecording(false);
    setLiveTranscript("");
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    recognitionRef.current = null;
    if (finalText) {
      setText("");
      onVoiceNote(finalText, audioUrl);
    } else {
      toast.info("没有识别到语音，可以输入文字后点“记为笔记”。");
    }
  }

  function stopRecording() {
    if (!isRecording) return;
    try {
      recognitionRef.current?.stop();
    } catch {
      recognitionRef.current = null;
    }

    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    } else {
      finishRecording((transcriptRef.current || text).trim());
    }
  }

  function submitChat() {
    const value = text.trim();
    if (!value) return;
    setText("");
    setKeyboardOpen(false);
    onAsk(value);
  }

  function submitNote() {
    const value = text.trim();
    if (!value) return;
    setText("");
    setKeyboardOpen(false);
    onVoiceNote(value);
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#DED1BD] bg-[#F7F1E8]/96 px-5 pb-[max(env(safe-area-inset-bottom),14px)] pt-3 backdrop-blur">
      <div className="mx-auto max-w-[430px]">
        {demoMode && (
          <div className="mb-3 flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {DEMO_PIPELINE_INPUTS.slice(0, 5).map((sample) => (
              <button
                key={sample.label}
                onClick={() => onVoiceNote(sample.text)}
                className="shrink-0 rounded-full border border-[#D9CCB8] bg-[#FFF9EF] px-3 py-1.5 text-xs font-semibold text-[#8B8174]"
              >
                {sample.label}
              </button>
            ))}
          </div>
        )}

        <AnimatePresence>
          {(keyboardOpen || text) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                rows={2}
                placeholder={activeTab === "chat" ? "问路线、穿搭、餐厅，也可以写成笔记" : "补充这段时间线"}
                className="mb-3 w-full resize-none rounded-[20px] border border-[#D9CCB8] bg-[#FFF9EF] px-4 py-3 text-base font-medium leading-6 outline-none placeholder:text-[#B2A693]"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {isRecording && (
          <div className="mb-3 rounded-[20px] border border-[#E2C5B7] bg-[#FFF4EA] px-4 py-3 text-sm font-semibold text-[#C86B4A]">
            {liveTranscript || "正在听你说话..."}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={() => setKeyboardOpen((value) => !value)}
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[#D9CCB8] bg-[#EFE7D8] text-[#8B8174]"
            aria-label="键盘输入"
          >
            <Keyboard size={20} />
          </button>

          <button
            onClick={() => fileRef.current?.click()}
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[#D9CCB8] bg-[#EFE7D8] text-[#8B8174]"
            aria-label="导入照片"
          >
            <ImagePlus size={20} />
          </button>

          <button
            onPointerDown={(event) => {
              event.preventDefault();
              void startRecording();
            }}
            onPointerUp={(event) => {
              event.preventDefault();
              stopRecording();
            }}
            onPointerCancel={stopRecording}
            className={`flex h-14 flex-1 items-center justify-center gap-2 rounded-full border text-base font-black transition-colors ${
              isRecording
                ? "border-[#C86B4A] bg-[#C86B4A] text-white"
                : "border-[#D9CCB8] bg-[#EFE7D8] text-[#8B8174]"
            }`}
          >
            {isRecording ? <Square size={17} /> : <Mic size={18} />}
            {isRecording ? "松开写入笔记" : "按住说话"}
          </button>

          <button
            onClick={submitChat}
            disabled={!text.trim()}
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#C86B4A] text-white disabled:opacity-45"
            aria-label="发送"
          >
            <Send size={20} />
          </button>
        </div>

        {text.trim() && (
          <div className="mt-3 flex justify-end">
            <button
              onClick={submitNote}
              className="rounded-full border border-[#E2C5B7] bg-[#FFF4EA] px-4 py-2 text-sm font-black text-[#C86B4A]"
            >
              记为笔记
            </button>
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.currentTarget.value = "";
            onImportPhotos(files);
          }}
        />
      </div>
    </div>
  );
}
