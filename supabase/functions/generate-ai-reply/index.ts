import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { context, platform, tone = "friendly" } = await req.json();

    if (!context) {
      throw new Error("Context is required");
    }

    const openAiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAiApiKey) {
      throw new Error("OPENAI_API_KEY is not set");
    }

    const systemPrompt = `You are a helpful social media assistant acting on behalf of the user. 
    Your goal is to generate a ${tone} and relevant reply based on the provided context.
    The context could be a received message or a comment on a post.
    Keep the reply concise, engaging, and suitable for ${
      platform || "social media"
    }.
    Do NOT include quotes around the reply.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Context: "${context}"\n\nGenerate a reply:`,
          },
        ],
        max_tokens: 150,
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(`OpenAI API Error: ${data.error.message}`);
    }

    const reply = data.choices[0].message.content.trim();

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
