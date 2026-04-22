import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit-log";
import {
  generateIdempotencyKey,
  checkIdempotencyKey,
} from "@/lib/idempotency";

const contactSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("A valid email is required"),
  phone: z.string().optional().default(""),
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

export async function POST(request: Request) {
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

    return NextResponse.json({ speech }, { status: 201 });
  } catch (err) {
    console.error("[speeches] Unhandled error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}