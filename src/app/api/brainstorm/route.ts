import { chat } from "@/lib/openrouter";
import type { ChatMessage } from "@/lib/openrouter";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BrainstormRequest {
  questionId: string;
  questionText: string;
  currentAnswer: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
}

// ---------------------------------------------------------------------------
// POST /api/brainstorm — SSE streaming brainstorming assistant
// ---------------------------------------------------------------------------

export async function POST(request: Request): Promise<Response> {
  // Parse request body
  let body: BrainstormRequest;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { questionText, currentAnswer, messages } = body;

  if (!questionText) {
    return new Response(
      JSON.stringify({ error: "questionText is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Build system prompt with question context
  const systemPrompt = `You are a speechwriting brainstorming assistant for STAR App. Help the user develop ideas for the question: ${questionText}. Be conversational, ask follow-up questions, suggest specific examples. Keep responses concise (2-3 sentences).${
    currentAnswer ? `\n\nThe user has already started answering: "${currentAnswer}"` : ""
  }`;

  // Assemble messages for OpenRouter
  const chatMessages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
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

    // Return as SSE error stream so client can handle it gracefully
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

          // Process complete SSE lines from OpenRouter
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? ""; // Keep incomplete line in buffer

          for (const line of lines) {
            const trimmed = line.trim();

            // Skip empty lines and comments
            if (!trimmed || trimmed.startsWith(":")) continue;

            // OpenRouter streaming format: "data: {...}" or "data: [DONE]"
            if (trimmed.startsWith("data: ")) {
              const payload = trimmed.slice(6); // Remove "data: " prefix

              if (payload === "[DONE]") {
                // End of stream
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                continue;
              }

              try {
                const parsed = JSON.parse(payload);
                const content = parsed.choices?.[0]?.delta?.content;

                if (content) {
                  // Forward content chunk as SSE
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify(content)}\n\n`)
                  );
                }
              } catch {
                // If JSON parse fails, forward raw payload
                controller.enqueue(
                  encoder.encode(`data: ${payload}\n\n`)
                );
              }
            }
          }
        }

        // Process any remaining buffer
        if (buffer.trim()) {
          const trimmed = buffer.trim();
          if (trimmed.startsWith("data: ")) {
            const payload = trimmed.slice(6);
            if (payload === "[DONE]") {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            } else {
              try {
                const parsed = JSON.parse(payload);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify(content)}\n\n`)
                  );
                }
              } catch {
                controller.enqueue(
                  encoder.encode(`data: ${payload}\n\n`)
                );
              }
            }
          }
        }

        // Ensure we always send [DONE] at the end
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Stream processing error";
        controller.enqueue(
          encoder.encode(
            `event: error\ndata: ${JSON.stringify({ error: errorMsg })}\n\n`
          )
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