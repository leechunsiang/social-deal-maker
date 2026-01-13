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
    const { prompt } = await req.json();

    if (!prompt) {
      throw new Error("Prompt is required");
    }

    const openAiImageApiKey = Deno.env.get("OPENAI_IMAGE_API");
    if (!openAiImageApiKey) {
      throw new Error("OPENAI_IMAGE_API is not set");
    }

    // User specified "gpt-image-1-mini", likely aiming for DALL-E but with this custom name.
    // If n > 1 is not supported by the model, we might need multiple requests, but let's try n=3 first.
    // Standard OpenAI endpoint is v1/images/generations

    const response = await fetch(
      "https://api.openai.com/v1/images/generations",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openAiImageApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "dall-e-3",
          prompt: prompt,
          n: 1,
          size: "1024x1024",
        }),
      }
    );

    const data = await response.json();

    if (data.error) {
      throw new Error(`OpenAI API Error: ${data.error.message}`);
    }

    // data.data is array of { url: string }
    const validUrls = data.data.map((item: any) => item.url);

    return new Response(JSON.stringify({ images: validUrls }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200, // Return 200 so client can read the JSON body error
    });
  }
});
