import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  try {
    const body = await req.json();
    console.log("Request Body:", JSON.stringify(body));
    const { media_urls, media_url, caption, post_id } = body;

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const fbAccessToken =
      Deno.env.get("FB_ACCESS_TOKEN") || Deno.env.get("FACEBOOK_ACCESS_TOKEN");
    const pageId = Deno.env.get("FB_PAGE_ID");

    if (!fbAccessToken || !pageId) {
      throw new Error(
        "Missing Facebook credentials. Please set FB_ACCESS_TOKEN and FB_PAGE_ID in your Supabase Edge Function secrets."
      );
    }

    // Normalize media
    let urls: string[] = media_urls || [];
    if (urls.length === 0 && media_url) urls = [media_url];

    let endpoint = "";
    let method = "POST";
    const params = new URLSearchParams({ access_token: fbAccessToken });

    // Determine post type and endpoint
    if (urls.length > 0) {
      // Has media
      const firstUrl = urls[0];
      const isVideo =
        firstUrl.includes(".mp4") ||
        firstUrl.includes(".mov") ||
        firstUrl.includes(".webm");

      if (isVideo) {
        // Video Post
        endpoint = `https://graph.facebook.com/v20.0/${pageId}/videos`;
        params.append("file_url", firstUrl);
        if (caption) params.append("description", caption);
      } else {
        // Photo Post
        endpoint = `https://graph.facebook.com/v20.0/${pageId}/photos`;
        params.append("url", firstUrl);
        if (caption) params.append("caption", caption);
      }
    } else {
      // Text only (Feed Post)
      endpoint = `https://graph.facebook.com/v20.0/${pageId}/feed`;
      if (caption) params.append("message", caption);
    }

    console.log(`Publishing to Facebook Page ${pageId} via ${endpoint}...`);

    // Perform request
    const res = await fetch(`${endpoint}?${params.toString()}`, {
      method: method,
    });
    const data = await res.json();

    if (data.error) {
      console.error("Facebook API Error:", data.error);
      throw new Error(`Facebook API Error: ${data.error.message}`);
    }

    console.log("Facebook Publish Success:", data);

    // Data usually contains 'id' or 'post_id'
    const resultId = data.id || data.post_id;

    // Update the scheduled_posts record with the Facebook post ID
    if (post_id && resultId) {
      const { error: updateError } = await supabase
        .from("scheduled_posts")
        .update({ fb_post_id: resultId })
        .eq("id", post_id);

      if (updateError) {
        console.error("Error updating fb_post_id:", updateError);
      } else {
        console.log(`Updated post ${post_id} with fb_post_id: ${resultId}`);
      }
    }

    return new Response(JSON.stringify({ success: true, id: resultId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("FB Edge Function Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200, // Return 200 to allow client to read error message
    });
  }
});
