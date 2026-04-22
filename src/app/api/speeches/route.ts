import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit-log";
import {
  generateIdempotencyKey,
  checkIdempotencyKey,
} from "@/lib/idempotency";
import { runSpeechPipeline } from "@/lib/pipeline";
import { speechRateLimiter, getClientIp, checkRateLimit } from "@/lib/rate-limit";

const contactSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("A valid email is required"),
  phone: z.string().min(1, "Phone number is required"),
});

const answerSchema = z.object({
  questionId: z.string().min(1, "Question ID is required"),
  answer: z.string().min(1, "Answer is required"),
});

const createSpeechSchema = z.object({
  contact: contactSchema,
  answers: z.array(answerSchema).min(1, "At least one answer is required"),
  idempotencyKey: z.string().optional(),
});

// GET /api/speeches - List speeches (admin only)
export async function GET(request: Request) {
  try {
    const admin = createAdminClient();
    
    // Get query params for pagination
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    
    const { data, error, count } = await admin
      .from("speeches")
      .select("id, first_name, last_name, email, phone, status, created_at, completed_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("[speeches] Failed to fetch speeches:", error);
      return NextResponse.json(
        { error: "Failed to fetch speeches" },
        { status: 500 }
      );
    }

    return NextResponse.json({ speeches: data, count }, { status: 200 });
  } catch (err) {
    console.error("[speeches] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  // Rate limit check
  const rateLimitResponse = await checkRateLimit(speechRateLimiter, getClientIp(request));
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await request.json();
    const parsed = createSpeechSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      return NextResponse.json(
        { error: "Validation failed", details: errors },
        { status: 400 }
      );
    }

    const { contact, answers, idempotencyKey: providedKey } = parsed.data;

    // Generate or use provided idempotency key
    const key =
      providedKey ??
      generateIdempotencyKey(
        contact.email,
        Object.fromEntries(answers.map((a) => [a.questionId, a.answer]))
      );

    // Check idempotency — if a speech with this key already exists, return it
    const existingId = await checkIdempotencyKey(key);
    if (existingId) {
      const admin = createAdminClient();
      const { data: existingSpeech, error: fetchError } = await admin
        .from("speeches")
        .select("id, status, created_at")
        .eq("id", existingId)
        .single();

      if (fetchError) {
        console.error("[speeches] Failed to fetch existing speech:", fetchError);
        return NextResponse.json(
          { error: "Internal server error" },
          { status: 500 }
        );
      }

      return NextResponse.json({ speech: existingSpeech }, { status: 200 });
    }

    // Insert new speech record
    const admin = createAdminClient();

    const { data: speech, error: insertError } = await admin
      .from("speeches")
      .insert({
        first_name: contact.firstName,
        last_name: contact.lastName,
        email: contact.email,
        phone: contact.phone,
        answers: answers,
        status: "pending",
        idempotency_key: key,
      })
      .select("id, status, created_at")
      .single();

    if (insertError) {
      console.error("[speeches] Failed to insert speech:", insertError);
      return NextResponse.json(
        { error: "Failed to create speech" },
        { status: 500 }
      );
    }

    // Audit log entry
    await writeAuditLog({
      action: "create",
      entityType: "speeches",
      entityId: speech.id,
      afterValue: {
        id: speech.id,
        status: speech.status,
        email: contact.email,
        idempotency_key: key,
      },
    });

    // Fire-and-forget: kick off the speech generation pipeline in the
    // background. We intentionally do NOT await this so the user gets an
    // immediate HTTP 201 response while the pipeline (brainstorm → draft →
    // audio → GHL) runs asynchronously. Pipeline errors are logged inside
    // runSpeechPipeline and do not affect the response.
    runSpeechPipeline(speech.id).catch((pipelineErr) => {
      console.error(
        `[speeches] Pipeline failed for speech ${speech.id}:`,
        pipelineErr
      );
    });

    return NextResponse.json({ speech }, { status: 201 });
  } catch (err) {
    console.error("[speeches] Unhandled error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}