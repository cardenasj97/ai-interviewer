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
  cancel: () => void;
  reset: () => void;
}

const TAIL_DEBOUNCE_MS = 400;

export function useSpeechRecognition(): SpeechRecognitionResult {
  const RecognitionCtor = getRecognitionCtor();
  const isSupported = RecognitionCtor !== null;

  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<IWebSpeechRecognition | null>(null);
  const tailTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);
  // Accumulate finals from Web Speech across the whole press-and-hold session.
  // We only flush this into the public `transcript` state when the user
  // actually releases — updating mid-session would cause the consumer to
  // submit while the user is still talking.
  const finalsRef = useRef<string>("");
  // True once the consumer has called stop() (i.e. user released). Until
  // then, any onend from Chrome is treated as an anti-idle auto-end and we
  // transparently restart recognition so the session keeps going.
  const userStoppedRef = useRef(false);
  // True while our own recognition.start() call is in flight — avoids
  // double-starts when restarts race with explicit stop requests.
  const restartingRef = useRef(false);
  // Chrome can clear the interim buffer to "" right before firing onend —
  // especially for short utterances it never finalizes into a final result.
  // We keep the last non-empty interim in a ref so the flush in onend can
  // recover it even if React's interimTranscript state has already been
  // cleared by a trailing empty onresult. Cleared when a final arrives
  // (that interim is now represented in finalsRef).
  const lastInterimRef = useRef<string>("");

  const startRecognitionInstance = useCallback(() => {
    if (!RecognitionCtor) return;
    const recognition = new RecognitionCtor();
    recognitionRef.current = recognition;
    // continuous=true keeps Chrome listening through natural pauses. It helps
    // with short silences; the onend auto-restart below handles longer ones.
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (e: IWebSpeechRecognitionEvent) => {
      if (cancelledRef.current) return;
      let interim = "";
      let gotFinal = false;
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        if (!result) continue;
        if (result.isFinal) {
          finalsRef.current = (finalsRef.current + " " + (result[0]?.transcript ?? "")).trim();
          gotFinal = true;
        } else {
          interim += result[0]?.transcript ?? "";
        }
      }
      // Preserve last non-empty interim so a trailing empty onresult from
      // Chrome can't erase our fallback. Clear it when a final arrives — at
      // that point the interim is already represented in finalsRef.
      if (gotFinal) lastInterimRef.current = "";
      if (interim) lastInterimRef.current = interim;
      setInterimTranscript(interim);
    };

    recognition.onerror = (e: IWebSpeechRecognitionErrorEvent) => {
      // 'aborted' fires when recognition.abort() is called programmatically
      // (e.g. during reset() after a successful transcript, or cancel() on
      // a too-short press). It's not a real failure — ignore.
      if (e.error === "aborted") return;
      // If we've already cancelled the recording (short-press grace), swallow
      // any late events so they don't surface as banner errors.
      if (cancelledRef.current) return;
      // 'no-speech' during an auto-restart cycle is also benign — the user is
      // just pausing. Only surface it if the user has actually released.
      if (e.error === "no-speech" && !userStoppedRef.current) return;
      // eslint-disable-next-line no-console
      console.warn("[useSpeechRecognition] onerror:", e.error);
      if (e.error === "not-allowed") {
        setError("MIC_DENIED");
      } else if (e.error === "no-speech") {
        setError("AUDIO_EMPTY");
      } else {
        setError(`STT_PROVIDER_ERROR:${e.error}`);
      }
    };

    recognition.onend = () => {
      if (cancelledRef.current) {
        setInterimTranscript("");
        finalsRef.current = "";
        lastInterimRef.current = "";
        return;
      }
      // If the user hasn't released yet, this was Chrome auto-ending on
      // silence/idle. Restart recognition without touching finalsRef or
      // lastInterimRef so the transcript keeps accumulating across the
      // restart (preserving any pre-auto-end interim that Chrome never
      // finalized).
      if (!userStoppedRef.current) {
        if (restartingRef.current) return;
        restartingRef.current = true;
        try {
          startRecognitionInstance();
        } catch {
          // If restart fails, fall through to flushing whatever we have.
          userStoppedRef.current = true;
        } finally {
          restartingRef.current = false;
        }
        if (!userStoppedRef.current) return;
      }
      // User-initiated stop: flush the accumulated transcript. The consumer
      // sees exactly one transcript change per press-and-hold session.
      // Use the ref fallback if React's interim state has already been
      // cleared by a trailing empty onresult.
      const fallbackInterim = lastInterimRef.current;
      const finals = finalsRef.current;
      lastInterimRef.current = "";
      finalsRef.current = "";
      setInterimTranscript((prevInterim) => {
        const effectiveInterim = prevInterim || fallbackInterim;
        const combined = (finals + " " + effectiveInterim).trim();
        // eslint-disable-next-line no-console
        console.debug("[useSpeechRecognition] flush", {
          finals,
          stateInterim: prevInterim,
          fallbackInterim,
          combined,
        });
        if (combined) setTranscript(combined);
        return "";
      });
    };

    try {
      recognition.start();
    } catch {
      setError("STT_PROVIDER_ERROR");
    }
  }, [RecognitionCtor]);

  const start = useCallback(() => {
    if (!RecognitionCtor) return;
    setError(null);
    setTranscript("");
    setInterimTranscript("");
    cancelledRef.current = false;
    userStoppedRef.current = false;
    finalsRef.current = "";
    lastInterimRef.current = "";
    startRecognitionInstance();
  }, [RecognitionCtor, startRecognitionInstance]);

  const stop = useCallback(() => {
    if (tailTimeoutRef.current) clearTimeout(tailTimeoutRef.current);
    tailTimeoutRef.current = setTimeout(() => {
      // Mark the release as user-initiated so onend flushes the transcript
      // instead of restarting recognition.
      userStoppedRef.current = true;
      recognitionRef.current?.stop();
    }, TAIL_DEBOUNCE_MS);
  }, []);

  const cancel = useCallback(() => {
    if (tailTimeoutRef.current) clearTimeout(tailTimeoutRef.current);
    cancelledRef.current = true;
    userStoppedRef.current = true;
    finalsRef.current = "";
    lastInterimRef.current = "";
    recognitionRef.current?.abort();
    setTranscript("");
    setInterimTranscript("");
  }, []);

  const reset = useCallback(() => {
    if (tailTimeoutRef.current) clearTimeout(tailTimeoutRef.current);
    userStoppedRef.current = true;
    finalsRef.current = "";
    lastInterimRef.current = "";
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
    cancel,
    reset,
  };
}
