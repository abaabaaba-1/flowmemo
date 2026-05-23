import type { Capsule, CapsuleEventType } from "@/lib/journey-types";
import type { DemoPhotoAsset } from "@/lib/demo-session";

export type MainTab = "chat" | "timeline";
export type ChatRole = "assistant" | "user";
export type ChatKind = "chat" | "note";
export type PhotoAsset = DemoPhotoAsset;

export interface PocketEvent {
  id: string;
  capsuleId: string;
  dayNumber?: number | null;
  type: CapsuleEventType;
  timestamp: Date;
  title: string;
  text?: string;
  transcript?: string;
  audioUrl?: string;
  audioDurationSeconds?: number | null;
  photoUrls: string[];
  videoUrls: string[];
  keywords: string[];
  location?: string | null;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: Date;
  kind?: ChatKind;
  audioUrl?: string;
  audioDurationSeconds?: number;
  streaming?: boolean;
}

export type SpeechRecognitionLike = {
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

export function dateText(value: unknown) {
  if (!value) return "";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
}

export function timeText(value: unknown) {
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

export function durationText(seconds: number | null | undefined) {
  const value = Math.max(0, Math.round(Number(seconds) || 0));
  const minutes = Math.floor(value / 60);
  const rest = value % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

export function tripTitle(destination?: string | null) {
  if (!destination) return "旅途中";
  if (destination.includes("日本")) return destination;
  return destination;
}

export function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function capsuleEventType(capsule: Capsule): CapsuleEventType {
  const value = String(capsule.eventType ?? "");
  if (["text", "audio", "photo", "video", "mixed"].includes(value)) {
    return value as CapsuleEventType;
  }
  if ((capsule.videoUrls ?? []).length > 0) return "video";
  if (capsule.audioUrl) return "audio";
  if ((capsule.photoUrls ?? []).length > 0 && !capsule.userRawText && !capsule.aiContent) return "photo";
  if ((capsule.photoUrls ?? []).length > 0) return "mixed";
  return "text";
}

export function buildPocketEvents(capsules: Capsule[]): PocketEvent[] {
  return capsules.flatMap((capsule) => {
    const baseType = capsuleEventType(capsule);
    const timestamp = new Date(capsule.capturedAt);
    const keywords = capsule.keywords ?? [];
    const text = capsule.userRawText || capsule.aiContent || "";
    const shared = {
      capsuleId: capsule.id,
      dayNumber: capsule.dayNumber,
      timestamp,
      title: capsule.title,
      keywords,
      location: capsule.location,
    };
    const events: PocketEvent[] = [];

    if (capsule.audioUrl) {
      events.push({
        ...shared,
        id: `${capsule.id}:audio`,
        type: "audio",
        transcript: text,
        audioUrl: capsule.audioUrl,
        audioDurationSeconds: capsule.audioDurationSeconds,
        photoUrls: [],
        videoUrls: [],
      });
    } else if (text && baseType !== "photo" && baseType !== "video") {
      events.push({
        ...shared,
        id: `${capsule.id}:text`,
        type: "text",
        text,
        photoUrls: [],
        videoUrls: [],
      });
    }

    if ((capsule.photoUrls ?? []).length > 0) {
      events.push({
        ...shared,
        id: `${capsule.id}:photo`,
        type: "photo",
        text: baseType === "photo" ? text : undefined,
        photoUrls: capsule.photoUrls ?? [],
        videoUrls: [],
      });
    }

    if ((capsule.videoUrls ?? []).length > 0) {
      events.push({
        ...shared,
        id: `${capsule.id}:video`,
        type: "video",
        text: baseType === "video" ? text : undefined,
        photoUrls: [],
        videoUrls: capsule.videoUrls ?? [],
      });
    }

    if (events.length === 0) {
      events.push({
        ...shared,
        id: `${capsule.id}:text`,
        type: "text",
        text: capsule.title,
        photoUrls: [],
        videoUrls: [],
      });
    }

    return events;
  });
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
  const urlHint = photo.url.startsWith("data:image/") ? "" : photo.url;
  const analysis = photo.aiAnalysis;
  return [
    urlHint,
    photo.label,
    photo.location,
    analysis?.scene,
    analysis?.location,
    analysis?.mood,
    analysis?.emotion,
    analysis?.suggestedCaption,
    ...(photo.tags ?? []),
    ...(analysis?.tags ?? []),
  ].join(" ");
}

function detectScene(text: string) {
  return MATCH_RULES.find((rule) => includesAny(text, rule.aliases));
}

export function fallbackDraft(text: string) {
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

function photoScore(
  photo: PhotoAsset,
  text: string,
  index: number,
  capsules: Capsule[],
  currentCapsuleId?: string
) {
  const blob = photoBlob(photo);
  const used = capsules.some(
    (capsule) => capsule.id !== currentCapsuleId && (capsule.photoUrls ?? []).includes(photo.url)
  );
  let score = 0;

  for (const rule of MATCH_RULES) {
    const textHits = hitCount(text, rule.aliases);
    const photoHits = hitCount(blob, [...rule.photoHints, ...rule.aliases]);
    if (textHits > 0 && photoHits > 0) {
      score += 34 + textHits * 5 + photoHits * 2;
    }
  }

  const analysis = photo.aiAnalysis;
  score += (photo.tags ?? []).reduce((sum, tag) => (includesAny(text, [tag]) ? sum + 8 : sum), 0);
  score += (analysis?.tags ?? []).reduce((sum, tag) => (includesAny(text, [tag]) ? sum + 8 : sum), 0);
  if (analysis?.scene && includesAny(text, [analysis.scene])) score += 18;
  if (analysis?.mood && includesAny(text, [analysis.mood])) score += 8;
  if (analysis?.emotion && includesAny(text, [analysis.emotion])) score += 8;
  if (photo.location && includesAny(text, [photo.location])) score += 12;
  if (analysis?.location && includesAny(text, [analysis.location])) score += 12;
  if (photo.isRetouched && score > 0) score += 3;
  if (used && score > 0) score -= 8;

  return score - index * 0.04;
}

export function matchPhotos(
  text: string,
  photoPool: PhotoAsset[],
  capsules: Capsule[],
  options: { currentCapsuleId?: string } = {}
) {
  return photoPool
    .map((photo, index) => ({
      photo,
      score: photoScore(photo, text, index, capsules, options.currentCapsuleId),
    }))
    .filter((item) => item.score >= 18)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((item) => item.photo);
}

export function capsuleSearchText(capsule: Capsule) {
  return [
    capsule.title,
    capsule.location,
    capsule.userRawText,
    capsule.aiContent,
    ...(capsule.keywords ?? []),
  ].join(" ");
}

export function inferredTagsFromName(label: string) {
  const tokens = label.split(/[\s._-]+/).filter(Boolean);
  const inferred = MATCH_RULES.flatMap((rule) =>
    includesAny(label, [...rule.photoHints, rule.key]) ? rule.aliases.slice(0, 7) : []
  );
  return [...new Set([...tokens, ...inferred, "照片", "相册", "旅行"])];
}

export function getSpeechRecognition() {
  if (typeof window === "undefined") return null;
  const scopedWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  const Ctor = scopedWindow.SpeechRecognition ?? scopedWindow.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}
