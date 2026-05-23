import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { ai } from "@eazo/sdk";
import { validateImageBase64Payload } from "@/lib/media-validation";

if (process.env.EAZO_PRIVATE_KEY) {
  ai.configure({ privateKey: process.env.EAZO_PRIVATE_KEY });
}

type ImageAnalysis = {
  scene: string;
  location: string;
  mood: string;
  emotion: string;
  tags: string[];
  suggestedCaption: string;
};

function compactText(input: unknown, fallback = "") {
  return typeof input === "string" && input.trim() ? input.trim().slice(0, 80) : fallback;
}

function normalizeTags(input: unknown) {
  if (!Array.isArray(input)) return [];
  return [
    ...new Set(
      input
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(Boolean)
        .slice(0, 8)
    ),
  ];
}

function parseJson(text: string) {
  const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  return JSON.parse(match?.[0] ?? cleaned) as Partial<ImageAnalysis>;
}

function fallbackAnalysis(fileName?: unknown): ImageAnalysis {
  const label = compactText(fileName, "travel-photo").replace(/\.[^.]+$/, "");
  const normalized = label.toLowerCase();
  const tags = label.split(/[\s._-]+/).filter(Boolean);

  if (/(shinjuku|tokyo|neon|rain|night)/i.test(normalized)) {
    return {
      scene: "rainy neon city street",
      location: /shinjuku/i.test(normalized) ? "Tokyo Shinjuku" : "Tokyo",
      mood: "cinematic",
      emotion: "immersive",
      tags: [...new Set([...tags, "tokyo", "shinjuku", "rain", "neon", "night"])],
      suggestedCaption: "Neon and rain turn the street into a movie frame.",
    };
  }

  if (/(izu|coast|sea|wave|rock)/i.test(normalized)) {
    return {
      scene: "rocky coast and sea view",
      location: "Izu coast",
      mood: "open",
      emotion: "free",
      tags: [...new Set([...tags, "izu", "coast", "sea", "waves", "rocky"])],
      suggestedCaption: "Sea wind leaves a bright edge on the day.",
    };
  }

  if (/(bamboo|shuzenji|path)/i.test(normalized)) {
    return {
      scene: "quiet bamboo path",
      location: "Shuzenji",
      mood: "calm",
      emotion: "healing",
      tags: [...new Set([...tags, "shuzenji", "bamboo", "path", "quiet"])],
      suggestedCaption: "A quiet path slows the whole trip down.",
    };
  }

  return {
    scene: "travel scene",
    location: "",
    mood: "memorable",
    emotion: "present",
    tags: [...new Set([...tags, "travel", "photo", "memory"])],
    suggestedCaption: "A small scene worth keeping in the journey.",
  };
}

function normalizeAnalysis(parsed: Partial<ImageAnalysis>, fileName?: unknown): ImageAnalysis {
  const fallback = fallbackAnalysis(fileName);
  const mood = compactText(parsed.mood, fallback.mood);
  return {
    scene: compactText(parsed.scene, fallback.scene),
    location: compactText(parsed.location, fallback.location),
    mood,
    emotion: compactText(parsed.emotion, mood || fallback.emotion),
    tags: normalizeTags(parsed.tags).length ? normalizeTags(parsed.tags) : fallback.tags,
    suggestedCaption: compactText(parsed.suggestedCaption, fallback.suggestedCaption),
  };
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { imageBase64, mimeType = "image/jpeg", fileName, demoMode = false } = body;

  if (!demoMode) {
    const auth = requireAuth(request);
    if (!auth.ok) return auth.response;
  }

  const imageValidation = validateImageBase64Payload({ imageBase64, mimeType });
  if (!imageValidation.ok) {
    return NextResponse.json(
      { error: imageValidation.error },
      { status: imageValidation.status }
    );
  }

  if (!process.env.EAZO_PRIVATE_KEY) {
    return NextResponse.json(fallbackAnalysis(fileName));
  }

  try {
    const dataUrl = `data:${imageValidation.mimeType};base64,${imageValidation.imageBase64}`;

    const result = await ai.chat({
      model: "qwen.qwen3-vl-235b-a22b-instruct",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this travel photo and return only compact JSON:
{
  "scene": "what is visible in the image, within 30 Chinese characters or short English phrase",
  "location": "specific or inferred place if visible, otherwise empty string",
  "mood": "visual atmosphere, such as calm, lively, cinematic, healing",
  "emotion": "human feeling suggested by the photo",
  "tags": ["3-8 short tags useful for matching this photo with travel notes"],
  "suggestedCaption": "one short travel journal caption"
}
Prefer Chinese for place names and captions when confident.`,
            },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
    });

    const rawText = result.choices[0].message.content ?? "{}";
    return NextResponse.json(normalizeAnalysis(parseJson(rawText), fileName));
  } catch {
    return NextResponse.json(fallbackAnalysis(fileName));
  }
}
