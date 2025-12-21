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
    const { media_urls, media_url, caption, post_type } = await req.json();

    const igAccessToken = Deno.env.get("IG_ACCESS_TOKEN");
    const igId = Deno.env.get("IG_ID") || Deno.env.get("VITE_IG_ID");

    if (!igAccessToken || !igId) {
      throw new Error("Missing Instagram credentials.");
    }

    // Normalize media to array
    let urls: string[] = media_urls || [];
    if (urls.length === 0 && media_url) urls = [media_url];

    if (urls.length === 0) {
      throw new Error(
        "No media provided (media_urls array or media_url string required)"
      );
    }

    // Auto-detect Carousel if multiple URLs provided for a POST
    let actualType = post_type;
    if ((!actualType || actualType === "POST") && urls.length > 1) {
      console.log(`Auto-detecting CAROUSEL due to ${urls.length} URLs.`);
      actualType = "CAROUSEL";
    }

    // Helper to create single container (Item or Standalone)
    const createContainer = async (
      url: string,
      isCarouselItem: boolean = false
    ) => {
      const isVideo = url.includes(".mp4") || url.includes(".mov");
      let params: any = { access_token: igAccessToken };

      if (isCarouselItem) {
        params.is_carousel_item = true;
        if (isVideo) {
          params.video_url = url;
          params.media_type = "VIDEO"; // Required for video items in carousel
        } else {
          params.image_url = url;
          // media_type not strictly required for image items, defaults OK
        }
      } else {
        // Standalone Post logic
        params.caption = caption || "";
        if (actualType === "STORY") {
          params.media_type = "STORIES";
          if (isVideo) params.video_url = url;
          else params.image_url = url;
        } else if (actualType === "REEL") {
          params.media_type = "REELS";
          params.video_url = url;
        } else {
          // Default Feed Post
          if (isVideo) {
            params.media_type = "REELS"; // IG encourages REELS for video
            params.video_url = url;
          } else {
            params.image_url = url;
          }
        }
      }

      const qs = new URLSearchParams(params).toString();
      const res = await fetch(
        `https://graph.instagram.com/v24.0/${igId}/media?${qs}`,
        {
          method: "POST",
        }
      );
      const data = await res.json();

      if (data.error) {
        throw new Error(
          `Container Creation Error (${isCarouselItem ? "Item" : "Single"}): ${
            data.error.message
          }`
        );
      }
      return data.id;
    };

    let creationId;

    if (actualType === "CAROUSEL" && urls.length > 0) {
      console.log(`Creating Carousel with ${urls.length} items (IDs)...`);

      // 1. Create Carousel Items
      const itemIds = await Promise.all(
        urls.map((url) => createContainer(url, true))
      );
      console.log("Item IDs created:", itemIds);

      // 2. Create Carousel Parent (Using JSON Body as per docs)
      const searchParams = new URLSearchParams({ access_token: igAccessToken });

      // Reverting to comma-separated STRING for children as per User's curl example.
      // previous attempt with Array failed with 400.
      const parentBody = {
        media_type: "CAROUSEL",
        children: itemIds.join(","), // Comma-separated STRING
        caption: caption || "",
      };

      console.log(
        "Creating Parent Container with body:",
        JSON.stringify(parentBody)
      );

      const res = await fetch(
        `https://graph.instagram.com/v24.0/${igId}/media?${searchParams}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parentBody),
        }
      );
      const data = await res.json();

      if (data.error) {
        console.error("Carousel Parent Creation Failed:", data.error);
        throw new Error(`Carousel Parent Error: ${data.error.message}`);
      }
      creationId = data.id;
      console.log("Carousel Parent ID:", creationId);
    } else {
      // Single Item
      console.log(
        `Creating Single Post (Type: ${actualType}, URLs: ${urls.length})...`
      );
      creationId = await createContainer(urls[0], false);
    }

    console.log(`Creation ID: ${creationId}. Waiting for processing...`);

    // Poll for container status
    let attempts = 0;
    const maxAttempts = 10;
    while (attempts < maxAttempts) {
      const statusUrl = `https://graph.instagram.com/v24.0/${creationId}?fields=status_code,status&access_token=${igAccessToken}`;
      const statusRes = await fetch(statusUrl);
      const statusData = await statusRes.json();

      console.log(
        `Container Status (${attempts + 1}/${maxAttempts}):`,
        statusData
      );

      if (statusData.status_code === "FINISHED") {
        break;
      }
      if (statusData.status_code === "ERROR") {
        throw new Error(`Container Processing Failed: ${statusData.status}`);
      }

      // Wait 3 seconds before next check
      await new Promise((r) => setTimeout(r, 3000));
      attempts++;
    }

    if (attempts === maxAttempts) {
      console.warn(
        "Timed out waiting for container to be ready. Attempting publish anyway..."
      );
    }

    // 3. Publish
    const publishUrl = `https://graph.instagram.com/v24.0/${igId}/media_publish`;
    const publishParams = new URLSearchParams({
      access_token: igAccessToken,
      creation_id: creationId,
    });

    console.log(`Publishing...`);
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
    console.error("Edge Function Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
