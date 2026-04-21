const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_BODY_BYTES = 12 * 1024 * 1024; // 12 MB
const MAX_IMAGE_B64_LEN = 14 * 1024 * 1024; // ~10 MB binary
const MAX_CODE_LEN = 200_000; // ~200 KB of source

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Reject oversized payloads before reading the body
    const contentLength = Number(req.headers.get("content-length") ?? "0");
    if (contentLength && contentLength > MAX_BODY_BYTES) {
      return jsonResponse({ error: "Request payload too large." }, 413);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY missing");
      return jsonResponse({ error: "Service is temporarily unavailable." }, 500);
    }

    let payload: { imageBase64?: unknown; code?: unknown; language?: unknown };
    try {
      payload = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body." }, 400);
    }

    const imageBase64 = typeof payload.imageBase64 === "string" ? payload.imageBase64 : undefined;
    const code = typeof payload.code === "string" ? payload.code : undefined;
    const language = typeof payload.language === "string" ? payload.language.slice(0, 50) : undefined;

    if (!imageBase64 && !code) {
      return jsonResponse({ error: "Provide imageBase64 or code" }, 400);
    }

    if (imageBase64) {
      if (imageBase64.length > MAX_IMAGE_B64_LEN) {
        return jsonResponse({ error: "Image is too large. Please use a smaller file." }, 413);
      }
      if (!/^data:image\/(png|jpe?g|webp|gif|bmp);base64,/i.test(imageBase64)) {
        return jsonResponse({ error: "Invalid image format. Provide a base64 data URL." }, 400);
      }
    }

    if (code && code.length > MAX_CODE_LEN) {
      return jsonResponse({ error: "Code is too long. Please shorten the input." }, 413);
    }

    const systemPrompt = `You are an expert code analyzer and compiler simulator. You will:
1. If given an image, perform OCR to extract the source code accurately. Preserve indentation.
2. Detect the programming language.
3. Predict the program's output as if executed.
4. List any syntax/runtime errors with line numbers and suggested fixes.
5. Briefly explain what the code does.
Respond ONLY by calling the provided "analysis_result" tool.`;

    const userContent: any[] = [];
    if (imageBase64) {
      userContent.push({ type: "text", text: "Extract and analyze the code in this image." });
      userContent.push({ type: "image_url", image_url: { url: imageBase64 } });
    } else {
      userContent.push({
        type: "text",
        text: `Analyze this ${language || "auto-detected"} code:\n\n${code}`,
      });
    }

    const body = {
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "analysis_result",
            description: "Return code analysis",
            parameters: {
              type: "object",
              properties: {
                extractedCode: { type: "string", description: "The full source code" },
                language: { type: "string" },
                output: { type: "string", description: "Predicted stdout output" },
                errors: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      line: { type: "number" },
                      severity: { type: "string", enum: ["error", "warning"] },
                      message: { type: "string" },
                      suggestion: { type: "string" },
                    },
                    required: ["message"],
                  },
                },
                explanation: { type: "string" },
              },
              required: ["extractedCode", "language", "output", "errors", "explanation"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "analysis_result" } },
    };

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        return jsonResponse({ error: "Rate limit hit. Try again shortly." }, 429);
      }
      if (resp.status === 402) {
        return jsonResponse(
          { error: "AI credits exhausted. Add funds in Settings → Workspace → Usage." },
          402,
        );
      }
      const t = await resp.text();
      console.error("Gateway error:", resp.status, t);
      return jsonResponse({ error: "AI gateway error" }, 500);
    }

    const data = await resp.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return jsonResponse({ error: "No analysis returned" }, 500);
    }
    const result = JSON.parse(toolCall.function.arguments);
    return jsonResponse(result);
  } catch (e) {
    console.error("analyze-code error:", e);
    return jsonResponse({ error: "Internal server error. Please try again." }, 500);
  }
});
