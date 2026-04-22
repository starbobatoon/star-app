/**
 * @module speech-generator
 * @description Speech text generation pipeline using Star Bobatoon's methodology.
 *
 * This module generates 5-minute speeches using the Hook/Story/Point/CTA/Exit structure.
 * It reads the active prompt from the database, calls OpenRouter with the primary slot,
 * parses the response into sections, and stores the results.
 *
 * IMPORTANT: Server-only — uses admin Supabase client and OpenRouter API.
 */

import "server-only";
import { chat } from "@/lib/openrouter";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit-log";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SpeechRecord {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  answers: Array<{
    questionId: string;
    answer: string;
  }>;
  status: string;
}

interface PromptRecord {
  id: string;
  content: string;
}

export interface GenerationResult {
  success: boolean;
  error?: string;
}

interface ParsedSpeechSections {
  hook: string;
  story: string;
  point: string;
  cta: string;
  exit: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Star Bobatoon's system prompt template that enforces the 5-section format.
 * This is combined with the active prompt content from the database.
 */

// ---------------------------------------------------------------------------
// Main Function
// ---------------------------------------------------------------------------

/**
 * Generates speech text for a given speech ID using Star Bobatoon's methodology.
 *
 * Pipeline:
 * 1. Reads the active prompt from the prompts table
 * 2. Reads the speech record (answers, contact info)
 * 3. Updates status to 'generating_text'
 * 4. Calls OpenRouter with structured system prompt
 * 5. Parses response into 5 sections
 * 6. Stores sections + full transcript in speeches table
 * 7. Updates status to 'generating_audio' on success, 'failed' on error
 *
 * @param speechId - The UUID of the speech to generate text for
 * @returns Object with success flag and optional error message
 */
export async function generateSpeechText(
  speechId: string
): Promise<GenerationResult> {
  const admin = createAdminClient();

  try {
    // -------------------------------------------------------------------------
    // Step 1: Fetch the active prompt from the database
    // -------------------------------------------------------------------------
    const { data: promptRecord, error: promptError } = await admin
      .from("prompts")
      .select("id, content")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single<PromptRecord>();

    if (promptError || !promptRecord) {
      const errorMsg = `No active prompt found in database: ${promptError?.message ?? "unknown error"}`;
      console.error("[speech-generator]", errorMsg);
      await failSpeech(admin, speechId, errorMsg);
      return { success: false, error: errorMsg };
    }

    // -------------------------------------------------------------------------
    // Step 2: Fetch the speech record
    // -------------------------------------------------------------------------
    const { data: speech, error: speechError } = await admin
      .from("speeches")
      .select(
        "id, first_name, last_name, email, phone, answers, status"
      )
      .eq("id", speechId)
      .single<SpeechRecord>();

    if (speechError || !speech) {
      const errorMsg = `Speech not found: ${speechError?.message ?? "unknown error"}`;
      console.error("[speech-generator]", errorMsg);
      return { success: false, error: errorMsg };
    }

    // -------------------------------------------------------------------------
    // Step 3: Update status to 'generating_text'
    // -------------------------------------------------------------------------
    const { error: statusError } = await admin
      .from("speeches")
      .update({
        status: "generating_text",
        updated_at: new Date().toISOString(),
      })
      .eq("id", speechId);

    if (statusError) {
      const errorMsg = `Failed to update speech status: ${statusError.message}`;
      console.error("[speech-generator]", errorMsg);
      return { success: false, error: errorMsg };
    }

    // -------------------------------------------------------------------------
    // Step 4: Build the user prompt from speech answers
    // -------------------------------------------------------------------------
    const userPrompt = await buildUserPrompt(speech, admin);

    // -------------------------------------------------------------------------
    // Step 5: Call OpenRouter with the primary slot
    // -------------------------------------------------------------------------
    const messages = [
      {
        role: "system",
        content: promptRecord.content,
      },
      {
        role: "user",
        content: userPrompt,
      },
    ];

    console.log(`[speech-generator] Calling OpenRouter for speech ${speechId}...`);

    const response = await chat({
      slot: "speechwriter",
      messages,
      stream: false,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      const errorMsg = `OpenRouter API error (${response.status}): ${errorBody}`;
      console.error("[speech-generator]", errorMsg);
      await failSpeech(admin, speechId, errorMsg);
      return { success: false, error: errorMsg };
    }

    const responseData = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string;
        };
      }>;
    };

    const aiContent = responseData.choices?.[0]?.message?.content;

    if (!aiContent) {
      const errorMsg = "OpenRouter returned empty response";
      console.error("[speech-generator]", errorMsg);
      await failSpeech(admin, speechId, errorMsg);
      return { success: false, error: errorMsg };
    }

    // -------------------------------------------------------------------------
    // Step 6: Parse the AI response into 5 sections
    // -------------------------------------------------------------------------
    let sections: ParsedSpeechSections;
    try {
      sections = parseSpeechSections(aiContent);
    } catch (parseError) {
      const errorMsg =
        parseError instanceof Error
          ? `Failed to parse AI response: ${parseError.message}`
          : "Failed to parse AI response: unknown error";
      console.error("[speech-generator]", errorMsg);
      await failSpeech(admin, speechId, errorMsg);
      return { success: false, error: errorMsg };
    }

    // -------------------------------------------------------------------------
    // Step 7: Build full transcript from sections
    // -------------------------------------------------------------------------
    const fullTranscript = buildFullTranscript(sections);

    // -------------------------------------------------------------------------
    // Step 8: Store sections and transcript in the database
    // -------------------------------------------------------------------------
    const { error: updateError } = await admin
      .from("speeches")
      .update({
        hook: sections.hook,
        story: sections.story,
        point: sections.point,
        cta: sections.cta,
        exit: sections.exit,
        transcript: fullTranscript,
        status: "generating_audio",
        updated_at: new Date().toISOString(),
      })
      .eq("id", speechId);

    if (updateError) {
      const errorMsg = `Failed to store speech sections: ${updateError.message}`;
      console.error("[speech-generator]", errorMsg);
      await failSpeech(admin, speechId, errorMsg);
      return { success: false, error: errorMsg };
    }

    // -------------------------------------------------------------------------
    // Step 9: Write audit log
    // -------------------------------------------------------------------------
    await writeAuditLog({
      action: "update",
      entityType: "speeches",
      entityId: speechId,
      beforeValue: { status: speech.status },
      afterValue: {
        status: "generating_audio",
        hook_length: sections.hook.length,
        story_length: sections.story.length,
        point_length: sections.point.length,
        cta_length: sections.cta.length,
        exit_length: sections.exit.length,
        total_words: fullTranscript.split(/\s+/).length,
      },
    });

    console.log(`[speech-generator] Successfully generated speech text for ${speechId}`);

    return { success: true };
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : "Unexpected error during speech generation";
    console.error("[speech-generator] Unexpected error:", error);
    await failSpeech(admin, speechId, errorMsg);
    return { success: false, error: errorMsg };
  }
}

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

/**
 * Builds a user prompt from the speech answers and contact information.
 */
async function buildUserPrompt(speech: SpeechRecord, admin: ReturnType<typeof createAdminClient>): Promise<string> {
  const firstName = speech.first_name ?? "";
  const lastName = speech.last_name ?? "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  let prompt = "";

  if (fullName) {
    prompt += `Speaker Name: ${fullName}\n\n`;
  }

  if (speech.answers && speech.answers.length > 0) {
    // Resolve question text from DB so the prompt gets real questions, not UUIDs
    const questionIds = speech.answers.map((a) => a.questionId);
    const { data: questionRows } = await admin
      .from("questions")
      .select("id, question_text")
      .in("id", questionIds);

    const questionMap = Object.fromEntries(
      (questionRows || []).map((q: { id: string; question_text: string }) => [q.id, q.question_text])
    );

    prompt += "Questionnaire Answers:\n";
    for (const answer of speech.answers) {
      const label = questionMap[answer.questionId] || `Question ${answer.questionId}`;
      prompt += `\nQuestion: ${label}\nAnswer: ${answer.answer}\n`;
    }
  } else {
    prompt += "No questionnaire answers provided. Please create a general motivational speech about owning your stage and embracing your real self.";
  }

  prompt += "\n\nGenerate a 5-minute speech using the Hook/Story/Point/CTA/Exit structure defined in your instructions.";

  return prompt;
}

/**
 * Parses the AI response into the 5 speech sections.
 * Expects format: "Hook:", "Story:", "Point:", "CTA:", "Exit:" headers.
 */
function parseSpeechSections(content: string): ParsedSpeechSections {
  const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Extract each section using regex
  const hookMatch = normalized.match(/Hook:\s*\n?([\s\S]*?)(?=\n\s*Story:|$)/i);
  const storyMatch = normalized.match(/Story:\s*\n?([\s\S]*?)(?=\n\s*Point:|$)/i);
  const pointMatch = normalized.match(/Point:\s*\n?([\s\S]*?)(?=\n\s*CTA:|$)/i);
  const ctaMatch = normalized.match(/CTA:\s*\n?([\s\S]*?)(?=\n\s*Exit:|$)/i);
  const exitMatch = normalized.match(/Exit:\s*\n?([\s\S]*?)$/i);

  if (!hookMatch || !storyMatch || !pointMatch || !ctaMatch || !exitMatch) {
    throw new Error(
      "Could not parse all 5 sections. Expected headers: Hook:, Story:, Point:, CTA:, Exit:"
    );
  }

  return {
    hook: cleanSection(hookMatch[1]),
    story: cleanSection(storyMatch[1]),
    point: cleanSection(pointMatch[1]),
    cta: cleanSection(ctaMatch[1]),
    exit: cleanSection(exitMatch[1]),
  };
}

/**
 * Cleans up a section string by trimming whitespace and removing extra newlines.
 */
function cleanSection(text: string): string {
  return text
    .trim()
    .replace(/\n{3,}/g, "\n\n") // Max 2 consecutive newlines
    .trim();
}

/**
 * Builds the full transcript by concatenating all sections with appropriate spacing.
 */
function buildFullTranscript(sections: ParsedSpeechSections): string {
  return [
    sections.hook,
    "",
    sections.story,
    "",
    sections.point,
    "",
    sections.cta,
    "",
    sections.exit,
  ].join("\n");
}

/**
 * Updates a speech record to failed status with an error message.
 */
async function failSpeech(
  admin: ReturnType<typeof createAdminClient>,
  speechId: string,
  errorMessage: string
): Promise<void> {
  try {
    await admin
      .from("speeches")
      .update({
        status: "failed",
        error_message: errorMessage,
        updated_at: new Date().toISOString(),
      })
      .eq("id", speechId);
  } catch (logError) {
    console.error("[speech-generator] Failed to log failure status:", logError);
  }
}
