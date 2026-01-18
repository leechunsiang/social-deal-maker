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
    const { recipient_id, message_text, attachment_url, attachment_type } =
      await req.json();

    if (!recipient_id) {
      throw new Error("Missing recipient_id");
    }

    if (!message_text && !attachment_url) {
      throw new Error("Missing message content (text or attachment)");
    }

    const fbAccessToken =
      Deno.env.get("MESSENGER_ACCESS_TOKEN") || Deno.env.get("FACEBOOK_ACCESS_TOKEN");
    if (!fbAccessToken) {
      throw new Error("Missing MESSENGER_ACCESS_TOKEN");
    }

    // Construct Payload
    let messagePayload: any = {};

    if (message_text) {
      messagePayload = { text: message_text };
    } else if (attachment_url) {
      messagePayload = {
        attachment: {
          type: attachment_type || "image",
          payload: {
            url: attachment_url,
            is_reusable: true,
          },
        },
      };
    }

    // Call Facebook Graph API
    const response = await fetch(
      `https://graph.facebook.com/v18.0/me/messages?access_token=${fbAccessToken}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipient: {
            id: recipient_id,
          },
          messaging_type: "RESPONSE",
          message: messagePayload,
        }),
      }
    );

    const data = await response.json();

    if (data.error) {
      console.error("Facebook API Error:", data.error);
      return new Response(JSON.stringify({ error: data.error }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error sending message:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
