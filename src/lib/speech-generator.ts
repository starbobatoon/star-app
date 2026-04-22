/**
 * @module speech-generator
 * @description Stub implementation for speech text generation.
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
 * Stub: generates speech text for a speech record.
 * TODO(W4-04): Replace with actual LLM-based generation.
 */
export async function generateSpeechText(
  _speechId: string
): Promise<GenerateResult> {
  console.log(`[speech-generator] Stub called for ${_speechId}`);
  // Placeholder: return success
  return { success: true };
}
