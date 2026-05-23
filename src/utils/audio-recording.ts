"use client";

const MAX_AUDIO_BYTES = 2_500_000;

export function chooseAudioMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/mpeg",
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  if (blob.size > MAX_AUDIO_BYTES) {
    return Promise.reject(new Error("语音过长，请控制在 60 秒以内"));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("读取语音失败"));
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("读取语音失败"));
      }
    };
    reader.readAsDataURL(blob);
  });
}
