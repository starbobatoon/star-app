"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Return type for the useVoiceInput hook.
 */
export interface VoiceInputResult {
  /** Whether the SpeechRecognition is currently listening */
  isListening: boolean;
  /** The current transcript text from voice recognition */
  transcript: string;
  /** Start listening for voice input */
  start: () => void;
  /** Stop listening and finalize the transcript */
  stop: () => void;
  /** Whether the Web Speech API is supported in this browser */
  isSupported: boolean;
  /** Error message if recognition failed, null otherwise */
  error: string | null;
}

/**
 * useVoiceInput — React hook wrapping the browser Web Speech API for
 * voice-to-text input on questionnaire questions.
 *
 * Features:
 * - Detects browser support for SpeechRecognition / webkitSpeechRecognition
 * - Handles iOS Safari quirks (requires user gesture to start recognition)
 * - Accumulates all final transcripts across the session
 * - Resets transcript on each new recognition session
 * - Graceful fallback: isSupported=false when the API is unavailable
 * - Exposes start/stop controls, listening state, transcript, and errors
 */
export function useVoiceInput(): VoiceInputResult {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const accumulatedRef = useRef("");

  // Detect support once on mount (client-side only)
  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    setIsSupported(supported);
  }, []);

  const start = useCallback(() => {
    if (!isSupported) {
      setError("Voice input is not supported in this browser.");
      return;
    }

    // If already listening, ignore
    if (recognitionRef.current) {
      return;
    }

    setError(null);
    accumulatedRef.current = "";
    setTranscript("");

    const SpeechRecognitionConstructor =
      window.SpeechRecognition || window.webkitSpeechRecognition!;

    const recognition = new SpeechRecognitionConstructor();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      // Accumulate final transcripts
      if (finalTranscript) {
        accumulatedRef.current += (accumulatedRef.current ? " " : "") + finalTranscript.trim();
      }

      // Show accumulated final + current interim
      const display = accumulatedRef.current + (interimTranscript ? (accumulatedRef.current ? " " : "") + interimTranscript : "");
      setTranscript(display);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "no-speech" || event.error === "aborted") {
        setIsListening(false);
        recognitionRef.current = null;
        return;
      }

      if (event.error === "not-allowed") {
        setError(
          "Microphone access was denied. Please allow microphone access in your browser settings and try again."
        );
      } else {
        setError(`Voice recognition error: ${event.error}`);
      }

      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
      // Ensure final accumulated text is set
      if (accumulatedRef.current) {
        setTranscript(accumulatedRef.current);
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to start voice recognition.";
      setError(
        `${message} If you're on iOS, please tap the microphone button directly.`
      );
      recognitionRef.current = null;
      setIsListening(false);
    }
  }, [isSupported]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, []);

  return {
    isListening,
    transcript,
    start,
    stop,
    isSupported,
    error,
  };
}
