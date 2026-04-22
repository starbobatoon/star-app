/**
 * @module fish-audio
 * @description Fish Audio S2 TTS API wrapper with inline tag support.
 *
 * IMPORTANT: This module uses API keys and Node.js APIs. It must only run
 * server-side. Never import this from a client component.
 *
 * The text parameter in synthesizeSpeech may contain Fish Audio inline tags
 * such as (break), (long-break), (emphasis)...(/emphasis), (slow)...(/slow),
 * (excited)...(/excited), (calm)...(/calm), and (whisper)...(/whisper).
 * These tags are passed through to the Fish Audio S2 API as-is for
 * expressive speech synthesis.
 *
 * FISH_AUDIO_API_KEY must be set in .env.local or the server environment.
 */

import "server-only";

const FISH_AUDIO_API_URL = "https://api.fish.audio/v1/tts";

/**
 * Parameters for speech synthesis via Fish Audio S2.
 */
export interface SynthesizeSpeechParams {
  /** The text to synthesize. May include Fish Audio inline tags like (break), (emphasis)...(/emphasis), etc. */
  text: string;
  /** The voice ID to use for synthesis (a Fish Audio voice UUID). */
  voiceId: string;
  /** Output audio format. Defaults to "mp3". */
  format?: "mp3" | "wav";
}

/**
 * Result of a successful speech synthesis call.
 */
export interface SynthesizeSpeechResult {
  /** The synthesized audio as a Buffer. */
  audio: Buffer;
  /** The MIME type of the audio data. */
  contentType: string;
}

/**
 * Custom error class for Fish Audio API errors, providing structured
 * information about what went wrong.
 */
export class FishAudioError extends Error {
  /** HTTP status code from the API response, if available. */
  public readonly statusCode?: number;
  /** Human-readable error category for programmatic handling. */
  public readonly category: "auth" | "rate_limit" | "api" | "network" | "unknown";

  constructor(
    message: string,
    statusCode?: number,
    category: FishAudioError["category"] = "unknown"
  ) {
    super(message);
    this.name = "FishAudioError";
    this.statusCode = statusCode;
    this.category = category;
  }
}

/**
 * Retrieves the Fish Audio API key from the environment.
 * @throws {FishAudioError} If the key is not configured.
 */
function getApiKey(): string {
  const key = process.env.FISH_AUDIO_API_KEY;
  if (!key) {
    throw new FishAudioError(
      "FISH_AUDIO_API_KEY is not set. Add it to your .env.local or server environment.",
      undefined,
      "auth"
    );
  }
  return key;
}

/**
 * Synthesizes speech audio from text using the Fish Audio S2 TTS API.
 *
 * The text may contain Fish Audio inline tags for expressive synthesis:
 * - `(break)` — short pause (~250ms)
 * - `(long-break)` — longer pause (~600ms)
 * - `(emphasis)word(/emphasis)` — vocal stress
 * - `(slow)phrase(/slow)` — slower delivery
 * - `(excited)phrase(/excited)` — energetic delivery
 * - `(calm)phrase(/calm)` — calm delivery
 * - `(whisper)phrase(/whisper)` — hushed delivery
 *
 * @param params - Synthesis parameters: text, voiceId, and optional format.
 * @returns A Buffer containing the synthesized audio data.
 * @throws {FishAudioError} On auth failure, rate limit, API error, or network issue.
 *
 * @example
 * ```ts
 * // Server-side only
 * import { synthesizeSpeech } from "@/lib/fish-audio";
 *
 * const audioBuffer = await synthesizeSpeech({
 *   text: "(break) Welcome to the show (emphasis)everyone(/emphasis)!",
 *   voiceId: "e75e1618ff544059be71409c5126b4c0",
 *   format: "mp3",
 * });
 * // audioBuffer is a Buffer containing MP3 audio data
 * ```
 */
export async function synthesizeSpeech(
  params: SynthesizeSpeechParams
): Promise<Buffer> {
  const { text, voiceId, format = "mp3" } = params;
  const apiKey = getApiKey();

  const contentType = format === "wav" ? "audio/wav" : "audio/mpeg";

  const body: Record<string, unknown> = {
    text,
    reference_id: voiceId,
  };

  let response: Response;

  try {
    response = await fetch(FISH_AUDIO_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new FishAudioError(
      `Network error calling Fish Audio API: ${err instanceof Error ? err.message : String(err)}`,
      undefined,
      "network"
    );
  }

  // Handle error status codes with specific error categories
  if (!response.ok) {
    const statusCode = response.status;
    let errorBody: string;

    try {
      errorBody = await response.text();
    } catch {
      errorBody = "(unable to read response body)";
    }

    if (statusCode === 401 || statusCode === 403) {
      throw new FishAudioError(
        `Fish Audio auth failed (HTTP ${statusCode}): ${errorBody}. Check your FISH_AUDIO_API_KEY.`,
        statusCode,
        "auth"
      );
    }

    if (statusCode === 429) {
      throw new FishAudioError(
        `Fish Audio rate limit exceeded (HTTP 429): ${errorBody}. Retry after a delay.`,
        statusCode,
        "rate_limit"
      );
    }

    throw new FishAudioError(
      `Fish Audio API error (HTTP ${statusCode}): ${errorBody}`,
      statusCode,
      "api"
    );
  }

  // Fish Audio returns audio binary data on success
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}