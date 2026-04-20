import { corsHeaders } from "@supabase/supabase-js/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { imageBase64, code, language } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    if (!imageBase64 && !code) {
      return new Response(JSON.stringify({ error: "Provide imageBase64 or code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
        return new Response(JSON.stringify({ error: "Rate limit hit. Try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Add funds in Settings → Workspace → Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const t = await resp.text();
      console.error("Gateway error:", resp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "No analysis returned" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const result = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-code error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
