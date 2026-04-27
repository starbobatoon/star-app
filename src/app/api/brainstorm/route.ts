import { chat } from "@/lib/openrouter";
import type { ChatMessage } from "@/lib/openrouter";
import { z } from "zod";
import { brainstormRateLimiter, getClientIp, checkRateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const brainstormSchema = z.object({
  questionId: z.string().min(1).optional(),
  questionText: z.string().min(1).max(500),
  currentAnswer: z.string().max(5000).optional().default(""),
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().min(1).max(2000),
  })).min(1).max(20),
});

// ---------------------------------------------------------------------------
// POST /api/brainstorm — SSE streaming brainstorming assistant
// ---------------------------------------------------------------------------

export async function POST(request: Request): Promise<Response> {
  // Rate limit check
  const rateLimitResponse = await checkRateLimit(brainstormRateLimiter, getClientIp(request));
  if (rateLimitResponse) return rateLimitResponse;

  // Parse and validate request body
  let body: z.infer<typeof brainstormSchema>;
  try {
    const raw = await request.json();
    const parsed = brainstormSchema.safeParse(raw);
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      return new Response(
        JSON.stringify({ error: "Validation failed", details: errors }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    body = parsed.data;
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { questionText, currentAnswer, messages } = body;

  // ── Load brainstorm custom prompt and knowledge base context ──
  let customBrainstormPrompt = "";
  let knowledgeBaseContext = "";

  try {
    const admin = createAdminClient();

    // Load custom brainstorm prompt from prompts table
    const { data: slotPrompt } = await admin
      .from("prompts")
      .select("content")
      .eq("notes", "slot:brainstorm")
      .eq("is_active", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (slotPrompt?.content) {
      customBrainstormPrompt = slotPrompt.content;
    }

    // Load knowledge base documents
    const { data: kbDocs } = await admin
      .from("prompts")
      .select("notes, content")
      .like("notes", "kb:%")
      .eq("is_active", false)
      .order("created_at", { ascending: false })
      .limit(10);

    if (kbDocs && kbDocs.length > 0) {
      const kbParts = kbDocs.map((doc) => {
        const title = doc.notes?.replace(/^kb:/, "") ?? "Document";
        return `=== ${title} ===\n${doc.content}`;
      });
      knowledgeBaseContext = "\n\n## Star's Knowledge Base\n" + kbParts.join("\n\n");
    }
  } catch {
    // Non-fatal — proceed without custom prompt or KB context
  }

  // ── Build system prompt ────────────────────────────────────────
  const baseInstructions = [
    customBrainstormPrompt ||
      "You are a thoughtful, encouraging brainstorming partner helping someone develop their speech.",
    "",
    `Help the user answer this question for their speech: "${questionText}"`,
    "Be conversational, ask follow-up questions, and suggest specific examples from their experience.",
    "Keep responses concise (2-4 sentences). After each exchange, offer a refined version of their answer.",
    currentAnswer
      ? `\nThe user has already started: "${currentAnswer}"`
      : "",
    knowledgeBaseContext,
  ].filter(Boolean).join("\n");

  // Assemble messages for OpenRouter
  const chatMessages: ChatMessage[] = [
    { role: "system", content: baseInstructions },
    ...(messages ?? []).map((m) => ({
      role: m.role as string,
      content: m.content,
    })),
  ];

  // Call OpenRouter with streaming enabled
  let openRouterResponse: Response;
  try {
    openRouterResponse = await chat({
      slot: "brainstorm",
      messages: chatMessages,
      stream: true,
    });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown OpenRouter error";

    const errorStream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: errorMessage })}\n\n`));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(errorStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  // Transform the OpenRouter streaming response into SSE format
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      const reader = openRouterResponse.body?.getReader();
      if (!reader) {
        controller.enqueue(
          encoder.encode(
            `event: error\ndata: ${JSON.stringify({ error: "No response body from OpenRouter" })}\n\n`
          )
        );
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
        return;
      }

      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(":")) continue;

            if (trimmed.startsWith("data: ")) {
              const payload = trimmed.slice(6);

              if (payload === "[DONE]") {
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                continue;
              }

              try {
                const parsed = JSON.parse(payload);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify(content)}\n\n`)
                  );
                }
              } catch {
                controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
              }
            }
          }
        }

        // Process any remaining buffer
        if (buffer.trim()) {
          const trimmed = buffer.trim();
          if (trimmed.startsWith("data: ")) {
            const payload = trimmed.slice(6);
            if (payload !== "[DONE]") {
              try {
                const parsed = JSON.parse(payload);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(content)}\n\n`));
                }
              } catch {
                controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
              }
            }
          }
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Stream processing error";
        controller.enqueue(
          encoder.encode(`event: error\ndata: ${JSON.stringify({ error: errorMsg })}\n\n`)
        );
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
