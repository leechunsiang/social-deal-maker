import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
    const body = await req.json();
    console.log("Reply to Comment Request:", JSON.stringify(body));
    const { comment_id, reply_message } = body;

    if (!comment_id || !reply_message) {
      throw new Error(
        "Missing required parameters: comment_id and reply_message"
      );
    }

    // Validate reply message is not empty
    if (reply_message.trim().length === 0) {
      throw new Error("Reply message cannot be empty");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Facebook access token
    const fbAccessToken =
      Deno.env.get("FACEBOOK_ACCESS_TOKEN") || Deno.env.get("FB_ACCESS_TOKEN");

    if (!fbAccessToken) {
      throw new Error(
        "Missing Facebook credentials (FACEBOOK_ACCESS_TOKEN)."
      );
    }

    // Fetch the fb_comment_id from the database
    const { data: commentData, error: commentError } = await supabase
      .from("post_comments")
      .select("fb_comment_id")
      .eq("id", comment_id)
      .single();

    if (commentError || !commentData) {
      console.error("Error fetching comment:", commentError);
      throw new Error("Comment not found");
    }

    const fb_comment_id = commentData.fb_comment_id;
    console.log(`Replying to Facebook comment: ${fb_comment_id}`);

    // Post reply to Facebook using Graph API
    // Endpoint: POST /{comment-id}/comments
    const params = new URLSearchParams({
      access_token: fbAccessToken,
      message: reply_message,
    });

    const endpoint = `https://graph.facebook.com/v20.0/${fb_comment_id}/comments`;
    const response = await fetch(endpoint, {
      method: "POST",
      body: params,
    });

    const data = await response.json();

    if (data.error) {
      console.error("Facebook API Error:", data.error);
      throw new Error(`Facebook API Error: ${data.error.message}`);
    }

    console.log("Facebook Reply Success:", data);

    // Store the reply in the database
    const replyId = data.id;
    const { error: insertError } = await supabase
      .from("comment_replies")
      .insert({
        comment_id: comment_id,
        fb_reply_id: replyId,
        message: reply_message,
        created_time: new Date().toISOString(),
      });

    if (insertError) {
      console.error("Error storing reply in database:", insertError);
      // Don't throw here - the reply was posted successfully to Facebook
    } else {
      console.log(`Stored reply ${replyId} in database`);
    }

    return new Response(JSON.stringify({ success: true, reply_id: replyId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Reply to Comment Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200, // Return 200 to allow client to read error message
    });
  }
});
