import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  const { method } = req;
  console.log(`Received ${method} request`);

  // Handle CORS preflight request
  if (method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Initialize Supabase client
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // --------------------------------------------------------------------------
  // GET: Webhook Verification
  // --------------------------------------------------------------------------
  if (method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    const verifyToken = Deno.env.get("MESSENGER_VERIFY_TOKEN");

    if (mode && token) {
      if (mode === "subscribe" && token === verifyToken) {
        console.log("WEBHOOK_VERIFIED");
        return new Response(challenge, { status: 200 });
      } else {
        console.error("Verification failed. Tokens do not match.");
        return new Response("Forbidden", { status: 403 });
      }
    }
    return new Response("Bad Request", { status: 400 });
  }

  // --------------------------------------------------------------------------
  // POST: Receive Messages
  // --------------------------------------------------------------------------
  if (method === "POST") {
    try {
      const body = await req.json();
      console.log("Received webhook event:", JSON.stringify(body));

      if (body.object === "page") {
        for (const entry of body.entry) {
          // Get the webhook event. entry.messaging is an array, but
          // will only contain one event, so we get index 0
          const webhook_event = entry.messaging[0];
          console.log("Processing event:", JSON.stringify(webhook_event));

          // Check for Echo (message from Page)
          if (webhook_event.message && webhook_event.message.is_echo) {
            console.log("Ignored echo message from page.");
            continue;
          }

          const sender_psid = webhook_event.sender.id; // Page Scoped ID

          // We only handle standard messages for now
          // (ignoring delivery reports, read receipts, etc. unless needed)
          if (webhook_event.message) {
            await handleMessage(sender_psid, webhook_event.message, supabase);
          } else if (webhook_event.postback) {
            // handlePostback(sender_psid, webhook_event.postback);
            console.log("Received postback (not implemented yet)");
          }
        }

        return new Response("EVENT_RECEIVED", {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "text/plain" },
        });
      } else {
        return new Response("Not a page event", { status: 404 });
      }
    } catch (error) {
      console.error("Error processing webhook:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response("Method Not Allowed", { status: 405 });
});

async function handleMessage(
  senderPsid: string,
  receivedMessage: any,
  supabase: any
) {
  // 1. Check if lead exists, if not create one
  await ensureLeadExists(senderPsid, supabase);

  // 2. Determine message type and content
  let messageType = "text";
  let messageContent = receivedMessage.text;

  // Handle attachments (images, etc.)
  if (receivedMessage.attachments) {
    const attachment = receivedMessage.attachments[0];
    messageType = attachment.type;
    messageContent = attachment.payload.url;
    // Note: Facebook URLs expire, for permanent storage needed to download and upload to storage bucket
    // For now, we store the URL provided.
  }

  // 3. Store message in database
  // First get the lead_id from the psid
  const { data: leadData, error: leadError } = await supabase
    .from("messenger_leads")
    .select("id")
    .eq("psid", senderPsid)
    .single();

  if (leadError || !leadData) {
    console.error("Failed to find lead after ensuring existence:", leadError);
    return;
  }

  const { error: messageError } = await supabase
    .from("messenger_messages")
    .upsert(
      {
        lead_id: leadData.id,
        message_id: receivedMessage.mid,
        content: messageContent,
        type: messageType,
        direction: "inbound",
        created_at: new Date(
          receivedMessage.timestamp || Date.now()
        ).toISOString(),
      },
      { onConflict: "message_id" }
    );

  if (messageError) {
    console.error("Error storing message:", messageError);
  } else {
    console.log("Message stored successfully.");
  }
}

async function ensureLeadExists(psid: string, supabase: any) {
  // Check if lead exists
  const { data: existingLead, error: checkError } = await supabase
    .from("messenger_leads")
    .select("id, first_name, last_name")
    .eq("psid", psid)
    .single();

  let shouldFetchProfile = false;
  if (!existingLead) {
    shouldFetchProfile = true;
  } else if (
    existingLead.first_name === "Unknown" &&
    existingLead.last_name === "User"
  ) {
    // If defaults were used, try fetching again (e.g. token was fixed)
    shouldFetchProfile = true;
    console.log(
      `Lead exists but matches default 'Unknown User'. Retrying profile fetch for PSID: ${psid}`
    );
  } else {
    return; // Lead exists and has valid data
  }

  if (!shouldFetchProfile) return;

  // Fetch user profile from Facebook
  console.log(`Fetching profile for PSID: ${psid}`);
  const fbAccessToken =
    Deno.env.get("MESSENGER_ACCESS_TOKEN") ||
    Deno.env.get("FB_ACCESS_TOKEN") ||
    Deno.env.get("FACEBOOK_ACCESS_TOKEN");

  let firstName = "Unknown";
  let lastName = "User";
  let profilePic = "";

  if (fbAccessToken) {
    try {
      const resp = await fetch(
        `https://graph.facebook.com/v18.0/${psid}?fields=first_name,last_name,profile_pic&access_token=${fbAccessToken}`
      );
      const profile = await resp.json();
      if (!profile.error) {
        firstName = profile.first_name || firstName;
        lastName = profile.last_name || lastName;
        profilePic = profile.profile_pic || profilePic;
      } else {
        console.error(
          "Error fetching FB profile:",
          JSON.stringify(profile.error)
        );
      }
    } catch (e) {
      console.error("Exception fetching FB profile:", e);
    }
  } else {
    console.warn("MESSENGER_ACCESS_TOKEN not set, cannot fetch user profile.");
  }

  if (existingLead) {
    // Update existing 'Unknown' lead
    const { error: updateError } = await supabase
      .from("messenger_leads")
      .update({
        first_name: firstName,
        last_name: lastName,
        profile_pic: profilePic,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingLead.id);

    if (updateError) {
      console.error("Error updating lead profile:", updateError);
    } else {
      console.log(`Updated profile for PSID: ${psid}`);
    }
  } else {
    // Create new lead
    const { error: insertError } = await supabase
      .from("messenger_leads")
      .insert({
        psid: psid,
        first_name: firstName,
        last_name: lastName,
        profile_pic: profilePic,
      });

    if (insertError) {
      console.error("Error creating new lead:", insertError);
    } else {
      console.log(`Created new lead for PSID: ${psid}`);
    }
  }
}
