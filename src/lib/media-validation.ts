export const MAX_PHOTO_URLS = 8;
export const MAX_VIDEO_URLS = 4;
export const MAX_IMAGE_DATA_URL_LENGTH = 3_000_000;
export const MAX_IMAGE_BASE64_LENGTH = 4_000_000;
export const MAX_AUDIO_DATA_URL_LENGTH = 3_500_000;
export const MAX_VIDEO_DATA_URL_LENGTH = 12_000_000;
export const MAX_REMOTE_MEDIA_URL_LENGTH = 4096;

const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

export function isAllowedImageMimeType(mimeType: unknown): mimeType is string {
  return typeof mimeType === "string" && /^image\/(jpeg|jpg|png|webp|gif|heic|heif)$/i.test(mimeType);
}

export function validateImageBase64Payload(input: {
  imageBase64?: unknown;
  mimeType?: unknown;
}): { ok: true; imageBase64: string; mimeType: string } | { ok: false; error: string; status: number } {
  if (typeof input.imageBase64 !== "string" || !input.imageBase64.trim()) {
    return { ok: false, error: "缺少图片数据", status: 400 };
  }

  const mimeType = typeof input.mimeType === "string" ? input.mimeType : "image/jpeg";
  if (!isAllowedImageMimeType(mimeType)) {
    return { ok: false, error: "仅支持图片文件", status: 400 };
  }

  const imageBase64 = input.imageBase64.trim();
  if (imageBase64.length > MAX_IMAGE_BASE64_LENGTH) {
    return { ok: false, error: "图片过大，请选择较小的图片", status: 413 };
  }

  if (!BASE64_RE.test(imageBase64)) {
    return { ok: false, error: "图片数据格式无效", status: 400 };
  }

  return { ok: true, imageBase64, mimeType };
}

function isValidMediaUrl(url: string) {
  if (url.startsWith("/demo/")) return true;
  if (/^https?:\/\/\S+$/i.test(url)) return url.length <= MAX_REMOTE_MEDIA_URL_LENGTH;
  if (url.startsWith("data:image/")) return url.length <= MAX_IMAGE_DATA_URL_LENGTH;
  return false;
}

function isValidAudioUrl(url: string) {
  if (/^https?:\/\/\S+$/i.test(url)) return url.length <= MAX_REMOTE_MEDIA_URL_LENGTH;
  if (url.startsWith("data:audio/")) return url.length <= MAX_AUDIO_DATA_URL_LENGTH;
  return false;
}

function isValidVideoUrl(url: string) {
  if (/^https?:\/\/\S+$/i.test(url)) return url.length <= MAX_REMOTE_MEDIA_URL_LENGTH;
  if (url.startsWith("data:video/")) return url.length <= MAX_VIDEO_DATA_URL_LENGTH;
  if (url.startsWith("blob:")) return true;
  return false;
}

export function validatePhotoUrls(
  input: unknown
): { ok: true; photoUrls: string[] | null } | { ok: false; error: string; status: number } {
  if (input === undefined || input === null) return { ok: true, photoUrls: null };
  if (!Array.isArray(input)) {
    return { ok: false, error: "图片列表格式无效", status: 400 };
  }

  if (input.length > MAX_PHOTO_URLS) {
    return { ok: false, error: `最多支持 ${MAX_PHOTO_URLS} 张图片`, status: 413 };
  }

  const photoUrls = input
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);

  if (photoUrls.some((url) => !isValidMediaUrl(url))) {
    return { ok: false, error: "图片地址格式无效或图片过大", status: 400 };
  }

  return { ok: true, photoUrls };
}

export function validateAudioUrl(
  input: unknown
): { ok: true; audioUrl: string | null } | { ok: false; error: string; status: number } {
  if (input === undefined || input === null || input === "") {
    return { ok: true, audioUrl: null };
  }
  if (typeof input !== "string") {
    return { ok: false, error: "语音地址格式无效", status: 400 };
  }

  const audioUrl = input.trim();
  if (!audioUrl) return { ok: true, audioUrl: null };
  if (!isValidAudioUrl(audioUrl)) {
    return { ok: false, error: "语音地址格式无效或语音过大", status: 400 };
  }

  return { ok: true, audioUrl };
}

export function validateVideoUrls(
  input: unknown
): { ok: true; videoUrls: string[] | null } | { ok: false; error: string; status: number } {
  if (input === undefined || input === null) return { ok: true, videoUrls: null };
  if (!Array.isArray(input)) {
    return { ok: false, error: "视频列表格式无效", status: 400 };
  }

  if (input.length > MAX_VIDEO_URLS) {
    return { ok: false, error: `最多支持 ${MAX_VIDEO_URLS} 段视频`, status: 413 };
  }

  const videoUrls = input
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);

  if (videoUrls.some((url) => !isValidVideoUrl(url))) {
    return { ok: false, error: "视频地址格式无效或视频过大", status: 400 };
  }

  return { ok: true, videoUrls };
}
