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
    const { media_url, caption, post_type } = await req.json();

    const igAccessToken = Deno.env.get("IG_ACCESS_TOKEN");
    const igId = Deno.env.get("IG_ID") || Deno.env.get("VITE_IG_ID");

    if (!igAccessToken || !igId) {
      throw new Error("Missing Instagram credentials.");
    }

    if (!media_url) {
      throw new Error("media_url is required");
    }

    // 1. Create Media Container
    let containerUrl = `https://graph.instagram.com/v24.0/${igId}/media`;
    let containerParams: any = {
      access_token: igAccessToken,
      caption: caption || "",
    };

    if (post_type === "STORY") {
      containerParams.media_type = "STORIES";
      if (media_url.includes(".mp4") || media_url.includes(".mov")) {
        containerParams.video_url = media_url;
        containerParams.media_type = "STORIES"; // Video story? Check Docs. Actually video_url implies video.
        // For stories, media_type=STORIES is correct. content can be image_url or video_url.
      } else {
        containerParams.image_url = media_url;
      }
    } else if (post_type === "REEL") {
      containerParams.media_type = "REELS";
      containerParams.video_url = media_url;
    } else {
      // Default: Feed Post
      if (media_url.includes(".mp4") || media_url.includes(".mov")) {
        containerParams.media_type = "REELS"; // Instagram mostly forces Video -> Reel now
        containerParams.video_url = media_url;
      } else {
        containerParams.image_url = media_url;
      }
    }

    // Construct query string
    const qs = new URLSearchParams(containerParams).toString();
    console.log(
      `Creating container: ${containerUrl}?${qs.replace(
        igAccessToken,
        "REDACTED"
      )}`
    );

    const containerRes = await fetch(`${containerUrl}?${qs}`, {
      method: "POST",
    });
    const containerData = await containerRes.json();

    if (containerData.error) {
      throw new Error(`Container Error: ${containerData.error.message}`);
    }

    const creationId = containerData.id;
    console.log(`Container created: ${creationId}`);

    // Wait slightly? Instagram sometimes needs time to process video.
    // For images it's fast. For videos, we might need to query status.
    // Simple implementation: try publish immediately. If fails due to "not ready", we fail.
    // A better approach is to loop check status, but for this MVP 'Post Now', let's try.
    // However, if it is video, we probably should wait or check status.

    // 2. Publish Container
    const publishUrl = `https://graph.instagram.com/v24.0/${igId}/media_publish`;
    const publishParams = new URLSearchParams({
      access_token: igAccessToken,
      creation_id: creationId,
    });

    // Check status if video (simple delay for now if REEL or Video)
    if (post_type === "REEL" || media_url.includes(".mp4")) {
      // Naive wait 5 seconds
      await new Promise((r) => setTimeout(r, 5000));
    }

    console.log(`Publishing container: ${creationId}`);
    const publishRes = await fetch(`${publishUrl}?${publishParams}`, {
      method: "POST",
    });
    const publishData = await publishRes.json();

    if (publishData.error) {
      throw new Error(`Publish Error: ${publishData.error.message}`);
    }

    return new Response(JSON.stringify({ success: true, id: publishData.id }), {
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
