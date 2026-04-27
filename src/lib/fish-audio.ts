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
const FISH_AUDIO_API_BASE = "https://api.fish.audio/v1";

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
  /** Optional API key to use instead of the environment variable. */
  apiKey?: string;
  /** TTS model name. Defaults to "s2-pro". */
  model?: string;
  /** Volume adjustment from -5 to 5. Defaults to 0. */
  volume?: number;
  /** Playback speed from 0.7 to 1.3. Defaults to 1.0. */
  speed?: number;
  /** Whether to normalize loudness. Defaults to true. */
  loudnessNormalization?: boolean;
  /** Whether to normalize text. Defaults to false. */
  textNormalization?: boolean;
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
  public readonly category: "auth" | "rate_limit" | "voice_invalid" | "api" | "network" | "unknown";

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
function getEnvApiKey(): string {
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
 * Result of a Fish Audio connection test, providing structured error info.
 */
export interface FishAudioTestResult {
  ok: boolean;
  /** Machine-readable error category for programmatic handling. */
  category?: "auth" | "rate_limit" | "voice_invalid" | "api" | "network";
  /** Human-readable description of what went wrong and how to fix it. */
  error?: string;
}

/**
 * Test the Fish Audio API connection with the provided or environment API key.
 * @param apiKey - Optional API key to test. If not provided, uses FISH_AUDIO_API_KEY env var.
 * @param voiceId - Optional voice ID to test with. If not provided, uses a minimal test.
 * @returns FishAudioTestResult with ok status and structured error info on failure.
 */
export async function testFishAudioConnection(apiKey?: string, voiceId?: string): Promise<FishAudioTestResult> {
  const key = apiKey || process.env.STAR_FISH_AUDIO_API_KEY || process.env.FISH_AUDIO_API_KEY;
  if (!key) {
    return { ok: false, category: "auth", error: "No API key provided. Add your Fish Audio API key." };
  }

  // Use provided voiceId or a safe test reference.
  // Without a real voice ID, we send a minimal request to validate the key only.
  const refId = voiceId || undefined;

  try {
    const body: Record<string, unknown> = {
      text: "Hi",
      model: "s2-pro",
    };
    if (refId) {
      body.reference_id = refId;
    }

    const response = await fetch(FISH_AUDIO_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (response.status === 401 || response.status === 403) {
      return { ok: false, category: "auth", error: `Fish Audio rejected the API key (HTTP ${response.status}). Check that your key is correct and active in the Fish Audio dashboard.` };
    }

    if (response.status === 429) {
      return { ok: false, category: "rate_limit", error: "Fish Audio rate limit exceeded (HTTP 429). Wait a moment and try again." };
    }

    // Check for invalid voice ID (400 with voice-related error)
    if (response.status === 400) {
      const errorBody = await response.text().catch(() => "");
      if (errorBody.toLowerCase().includes("voice") || errorBody.toLowerCase().includes("reference")) {
        return { ok: false, category: "voice_invalid", error: `Voice ID is not valid. Verify the voice ID in your Fish Audio dashboard.` };
      }
      return { ok: false, category: "api", error: `Fish Audio returned HTTP 400: ${errorBody.slice(0, 200)}` };
    }

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      return { ok: false, category: "api", error: `Fish Audio returned HTTP ${response.status}: ${errorBody.slice(0, 200)}` };
    }

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      category: "network",
      error: `Network error contacting Fish Audio: ${err instanceof Error ? err.message : String(err)}. Check your internet connection.`,
    };
  }
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
 *   voiceId: "your-fish-audio-voice-id",
 *   format: "mp3",
 * });
 * // audioBuffer is a Buffer containing MP3 audio data
 * ```
 */
export async function synthesizeSpeech(
  params: SynthesizeSpeechParams
): Promise<Buffer> {
  const {
    text,
    voiceId,
    format = "mp3",
    apiKey,
    model = "s2-pro",
    volume = 0,
    speed = 1.0,
    loudnessNormalization = true,
    textNormalization = false,
  } = params;
  if (!apiKey) {
    throw new FishAudioError(
      "No API key provided. Configure in Voice Settings.",
      undefined,
      "auth"
    );
  }
  const key = apiKey;

  // Fish Audio API field structure (verified by direct API testing):
  //   - speed/volume must be nested under a `prosody` object — sending them at
  //     root is silently ignored. That's been the dummy-settings bug.
  //   - text normalization is `normalize` at root (boolean).
  //   - loudness_normalization has no direct Fish Audio equivalent; passed
  //     through for forward compatibility but Fish Audio currently ignores it.
  //   - The s2-pro model is selected via the URL path or the `chunk_length`
  //     and other params; we leave `model` here for record-keeping.
  const body: Record<string, unknown> = {
    text,
    reference_id: voiceId,
    model,
    prosody: {
      speed,
      volume,
    },
    normalize: textNormalization,
    loudness_normalization: loudnessNormalization,
  };

  let response: Response;

  // Fish Audio Starter tier allows 5 concurrent requests. We absorb transient
  // rate-limit hits with exponential backoff: 3s, 8s, 20s. After 3 attempts,
  // surface the 429 to the caller so the pipeline marks the speech failed.
  const RATE_LIMIT_BACKOFF_MS = [3_000, 8_000, 20_000];
  const MAX_ATTEMPTS = RATE_LIMIT_BACKOFF_MS.length + 1;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    // 90-second timeout per attempt
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90_000);

    try {
      response = await fetch(FISH_AUDIO_API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeout);
      const isAbort = err instanceof Error && err.name === "AbortError";
      throw new FishAudioError(
        isAbort
          ? "Fish Audio API timed out after 90 seconds. Try a shorter speech or retry."
          : `Network error calling Fish Audio API: ${err instanceof Error ? err.message : String(err)}`,
        undefined,
        "network"
      );
    }
    clearTimeout(timeout);

    // Auto-retry on 429 (rate limit). Other errors fall through to the handler below.
    if (response.status === 429 && attempt < MAX_ATTEMPTS) {
      const waitMs = RATE_LIMIT_BACKOFF_MS[attempt - 1];
      console.warn(
        `[fish-audio] Rate limited (HTTP 429), attempt ${attempt}/${MAX_ATTEMPTS}, waiting ${waitMs}ms before retry...`
      );
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      continue;
    }
    break; // Success, non-429 error, or exhausted retries — handle below
  }
  // response is always assigned (the for-loop guarantees it), but TS can't see that.
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  response = response!;

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

    if (statusCode === 400) {
      const lower = errorBody.toLowerCase();
      if (lower.includes("voice") || lower.includes("reference")) {
        throw new FishAudioError(
          `Invalid voice ID. Verify the voice ID in your Fish Audio dashboard.`,
          statusCode,
          "voice_invalid"
        );
      }
      throw new FishAudioError(
        `Fish Audio request error (HTTP 400): ${errorBody}`,
        statusCode,
        "api"
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