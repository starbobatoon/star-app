/**
 * @module audio-generator
 * @description Stub implementation for speech audio generation.
 *
 * This is a placeholder — the full implementation is being built in W4-04.
 * The stub returns success so dependent code compiles and tests pass.
 */

import "server-only";

export interface GenerateResult {
  success: boolean;
  error?: string;
}

/**
 * Stub: generates speech audio for a speech record.
 * TODO(W4-04): Replace with actual Fish Audio TTS integration.
 */
export async function generateSpeechAudio(
  _speechId: string
): Promise<GenerateResult> {
  console.log(`[audio-generator] Stub called for ${_speechId}`);
  // Placeholder: return success
  return { success: true };
}
