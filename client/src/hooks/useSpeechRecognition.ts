import { useCallback, useRef, useState } from "react";

// Self-contained Web Speech API type definitions (not all browsers ship these in DOM lib yet)
interface IWebSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: IWebSpeechRecognitionEvent) => void) | null;
  onerror: ((event: IWebSpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface IWebSpeechAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface IWebSpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): IWebSpeechAlternative;
  readonly [index: number]: IWebSpeechAlternative;
}

interface IWebSpeechRecognitionResultList {
  readonly length: number;
  readonly [index: number]: IWebSpeechRecognitionResult;
}

interface IWebSpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: IWebSpeechRecognitionResultList;
}

interface IWebSpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}

type WebSpeechRecognitionCtor = new () => IWebSpeechRecognition;

function getRecognitionCtor(): WebSpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: WebSpeechRecognitionCtor;
    webkitSpeechRecognition?: WebSpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export interface SpeechRecognitionResult {
  isSupported: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

export function useSpeechRecognition(): SpeechRecognitionResult {
  const RecognitionCtor = getRecognitionCtor();
  const isSupported = RecognitionCtor !== null;

  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<IWebSpeechRecognition | null>(null);

  const start = useCallback(() => {
    if (!RecognitionCtor) return;
    setError(null);
    setTranscript("");
    setInterimTranscript("");

    const recognition = new RecognitionCtor();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (e: IWebSpeechRecognitionEvent) => {
      let final = "";
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        if (!result) continue;
        if (result.isFinal) {
          final += result[0]?.transcript ?? "";
        } else {
          interim += result[0]?.transcript ?? "";
        }
      }
      if (final) setTranscript((prev) => (prev + " " + final).trim());
      setInterimTranscript(interim);
    };

    recognition.onerror = (e: IWebSpeechRecognitionErrorEvent) => {
      if (e.error === "not-allowed") {
        setError("MIC_DENIED");
      } else if (e.error === "no-speech") {
        setError("AUDIO_EMPTY");
      } else {
        setError("STT_PROVIDER_ERROR");
      }
    };

    recognition.onend = () => {
      // Chrome quirk: sometimes no final result is emitted, only interim.
      // Promote last interim to final on end so the consumer sees a transcript.
      setInterimTranscript((prevInterim) => {
        if (prevInterim.trim()) {
          setTranscript((prev) => (prev + " " + prevInterim).trim());
        }
        return "";
      });
    };

    try {
      recognition.start();
    } catch {
      setError("STT_PROVIDER_ERROR");
    }
  }, [RecognitionCtor]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const reset = useCallback(() => {
    recognitionRef.current?.abort();
    setTranscript("");
    setInterimTranscript("");
    setError(null);
  }, []);

  return {
    isSupported,
    transcript,
    interimTranscript,
    error,
    start,
    stop,
    reset,
  };
}
