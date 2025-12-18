// Setup type definitions for built-in Supabase Edge Functions
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { recipient_id, message_text } = await req.json();

    // Retrieve secrets from environment
    // User must set these via: supabase secrets set IG_ACCESS_TOKEN=... VITE_IG_ID=... (or just IG_ID)
    const igAccessToken = Deno.env.get("IG_ACCESS_TOKEN");
    const igId = Deno.env.get("IG_ID") || Deno.env.get("VITE_IG_ID");

    if (!igAccessToken || !igId) {
      throw new Error(
        "Missing Instagram credentials in Edge Function secrets."
      );
    }

    // Call Instagram API
    const response = await fetch(
      `https://graph.instagram.com/v24.0/${igId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${igAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipient: {
            id: recipient_id,
          },
          message: {
            text: message_text,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify({ error: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
