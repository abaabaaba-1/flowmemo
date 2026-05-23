"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpenCheck, FilePlus2, Keyboard, Loader2, Mic, Send, Square } from "lucide-react";
import { toast } from "sonner";
import type { PromptSuggestion } from "@/lib/api";
import { blobToDataUrl, chooseAudioMimeType } from "@/utils/audio-recording";
import type { MainTab, SpeechRecognitionLike } from "./journey-utils";
import { getSpeechRecognition } from "./journey-utils";

type TextIntent = "ask" | "note";

interface GlobalInputBarProps {
  activeTab: MainTab;
  selectedPhotoCount?: number;
  promptSuggestions?: PromptSuggestion[];
  isUpdatingPrompts?: boolean;
  onAsk: (text: string) => void;
  onVoiceNote: (text: string, audioUrl?: string, audioDurationSeconds?: number) => void;
  onImportPhotos: (files: File[]) => void;
}

const WAVEFORM_HEIGHTS = [40, 60, 30, 80, 50, 70, 40, 90, 60, 30, 50, 70, 40, 30, 55, 45];

export function GlobalInputBar({
  activeTab,
  selectedPhotoCount = 0,
  promptSuggestions = [],
  isUpdatingPrompts = false,
  onAsk,
  onVoiceNote,
  onImportPhotos,
}: GlobalInputBarProps) {
  const [text, setText] = useState("");
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [textIntent, setTextIntent] = useState<TextIntent>("ask");
  const [isRecording, setIsRecording] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const transcriptRef = useRef("");
  const stopTimerRef = useRef<number | null>(null);
  const recordingStartedAtRef = useRef<number | null>(null);
  const activeMode = activeTab === "timeline" ? "note" : textIntent;

  function clearRecordingTimer() {
    if (stopTimerRef.current === null) return;
    window.clearTimeout(stopTimerRef.current);
    stopTimerRef.current = null;
  }

  async function startRecording() {
    if (isRecording) return;
    setIsRecording(true);
    setLiveTranscript("");
    transcriptRef.current = "";
    chunksRef.current = [];
    recordingStartedAtRef.current = Date.now();

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
      const mimeType = chooseAudioMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        clearRecordingTimer();
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        void finishRecording((transcriptRef.current || text).trim(), blob);
      };
      recorderRef.current = recorder;
      recorder.start();
      stopTimerRef.current = window.setTimeout(stopRecording, 60_000);
    } catch {
      setIsRecording(false);
      recognitionRef.current?.abort?.();
      toast.info("当前浏览器无法录音，可以输入文字后点“记为笔记”。");
    }
  }

  async function finishRecording(finalText: string, blob?: Blob) {
    const audioDurationSeconds = recordingStartedAtRef.current
      ? Math.max(1, Math.round((Date.now() - recordingStartedAtRef.current) / 1000))
      : undefined;
    setIsRecording(false);
    setLiveTranscript("");
    clearRecordingTimer();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    recognitionRef.current = null;
    recordingStartedAtRef.current = null;

    let audioUrl: string | undefined;
    if (blob && blob.size > 0) {
      try {
        audioUrl = await blobToDataUrl(blob);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "语音处理失败");
      }
    }

    if (finalText) {
      setText("");
      onVoiceNote(finalText, audioUrl, audioDurationSeconds);
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
      void finishRecording((transcriptRef.current || text).trim());
    }
  }

  function submitPrimary() {
    const value = text.trim();
    if (!value) return;
    setText("");
    setKeyboardOpen(false);
    if (activeMode === "ask") {
      onAsk(value);
    } else {
      onVoiceNote(value);
    }
  }

  function applyPromptSuggestion(suggestion: PromptSuggestion) {
    if (suggestion.intent === "note") {
      onVoiceNote(suggestion.text);
      return;
    }

    onAsk(suggestion.text);
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-white via-white/95 to-white/0 px-6 pb-[max(env(safe-area-inset-bottom),40px)] pt-8">
      <div className="mx-auto max-w-[430px]">
        {selectedPhotoCount > 0 && (
          <div className="mb-3 rounded-2xl bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-[0_10px_30px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70">
            已选择 {selectedPhotoCount} 张照片，下一条笔记会优先关联
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
              {activeTab === "chat" && (
                <div className="mb-2 flex rounded-full bg-white p-1 shadow-[0_8px_24px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70">
                  <button
                    type="button"
                    onClick={() => setTextIntent("ask")}
                    aria-pressed={textIntent === "ask"}
                    className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
                      textIntent === "ask"
                        ? "bg-slate-900 text-white"
                        : "text-slate-500"
                    }`}
                  >
                    问助手
                  </button>
                  <button
                    type="button"
                    onClick={() => setTextIntent("note")}
                    aria-pressed={textIntent === "note"}
                    className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
                      textIntent === "note"
                        ? "bg-slate-900 text-white"
                        : "text-slate-500"
                    }`}
                  >
                    记 Pocket
                  </button>
                </div>
              )}
              <textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                rows={2}
                placeholder={activeMode === "ask" ? "问路线、穿搭、餐厅或记录整理" : "写下这一刻的声音、气味、心情"}
                className="mb-3 w-full resize-none rounded-[24px] bg-white px-4 py-3 text-base font-medium leading-6 text-slate-700 shadow-[0_12px_34px_rgba(15,23,42,0.08)] outline-none ring-1 ring-slate-200/70 placeholder:text-slate-400"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {isRecording && (
          <div className="mb-3 rounded-[22px] bg-white px-4 py-3 text-sm font-semibold text-slate-600 shadow-[0_12px_34px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70">
            {liveTranscript || "正在听你说话..."}
          </div>
        )}

        <div className="overflow-hidden rounded-[32px] bg-white shadow-[0_16px_42px_rgba(15,23,42,0.12)] ring-1 ring-slate-200/80">
          {activeTab === "chat" && (promptSuggestions.length > 0 || isUpdatingPrompts) && (
            <div className="border-b border-slate-100 px-3 py-3">
              <div className="journey-no-scrollbar flex gap-2 overflow-x-auto">
                {promptSuggestions.map((suggestion, index) => (
                  <button
                    key={`${suggestion.intent}-${suggestion.label}-${index}`}
                    onClick={() => applyPromptSuggestion(suggestion)}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${
                      suggestion.intent === "note"
                        ? "bg-slate-100 text-slate-700 ring-slate-200"
                        : "bg-slate-50 text-slate-500 ring-slate-200"
                    }`}
                  >
                    {suggestion.label}
                  </button>
                ))}
                {isUpdatingPrompts && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-400 ring-1 ring-slate-200">
                    <Loader2 size={12} className="animate-spin" />
                    更新中
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 px-4 py-3">
            <button
              onClick={() => setKeyboardOpen((value) => !value)}
              className="flex shrink-0 p-2 text-slate-500 transition-colors hover:text-slate-700"
              aria-label="键盘输入"
            >
              <Keyboard size={24} />
            </button>

            <button
              onClick={submitPrimary}
              disabled={!text.trim()}
              className="flex h-8 flex-1 items-center justify-center gap-[2px] text-slate-500 disabled:cursor-default"
              aria-label={activeMode === "ask" ? "发送" : "保存笔记"}
            >
              {text.trim() ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
                  {activeMode === "ask" ? <Send size={13} /> : <BookOpenCheck size={13} />}
                  {activeMode === "ask" ? "发送" : "写入"}
                </span>
              ) : (
                WAVEFORM_HEIGHTS.map((height, index) => (
                  <span
                    key={index}
                    className="w-[3px] rounded-full bg-slate-400"
                    style={{ height: `${height}%` }}
                  />
                ))
              )}
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
              aria-label={isRecording ? "松开写入笔记" : "按住记笔记"}
              className={`flex shrink-0 p-2 transition-colors ${
                isRecording
                  ? "text-slate-900"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {isRecording ? <Square size={24} /> : <Mic size={24} />}
            </button>

            <button
              onClick={() => fileRef.current?.click()}
              className="relative flex shrink-0 p-2 text-slate-500 transition-colors hover:text-slate-700"
              aria-label="导入照片或视频"
            >
              <FilePlus2 size={24} />
              {selectedPhotoCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-900 px-1 text-[10px] font-semibold text-white">
                  {selectedPhotoCount}
                </span>
              )}
            </button>
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
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
