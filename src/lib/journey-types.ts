import type { Capsule } from "@/lib/db/schema/capsules";
import type { Journey } from "@/lib/db/schema/journeys";

export type { Capsule, Journey };

export type StyleKey = "cinematic" | "healing" | "xiaohongshu" | "poetic" | "funny";
export type CapsuleEventType = "text" | "audio" | "photo" | "video" | "mixed";

export const CAPSULE_EVENT_TYPES: CapsuleEventType[] = [
  "text",
  "audio",
  "photo",
  "video",
  "mixed",
];

export const STYLE_LABELS: Record<StyleKey, { label: string; desc: string }> = {
  cinematic: { label: "电影旁白", desc: "沉浸、有画面感" },
  healing: { label: "治愈系", desc: "温柔、自然" },
  xiaohongshu: { label: "小红书", desc: "轻快、适合分享" },
  poetic: { label: "诗意", desc: "留白、悠远" },
  funny: { label: "轻松吐槽", desc: "幽默、有生活感" },
};

export interface CapsuleMessage {
  type: "capsule";
  capsule: Capsule;
}

export interface UserMessage {
  type: "user";
  text?: string;
  photos?: string[];
  timestamp: Date;
}

export interface GeneratingMessage {
  type: "generating";
  id: string;
  text: string;
  stage: "thinking" | "writing";
}

export type JourneyMessage = CapsuleMessage | UserMessage | GeneratingMessage;
