import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { video_id } = await req.json();

    if (!video_id) {
      throw new Error("video_id is required");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Get video details
    const { data: video, error: videoError } = await supabaseClient
      .from("videos")
      .select("*")
      .eq("id", video_id)
      .single();

    if (videoError || !video) {
      throw new Error("Video not found");
    }

    // 2. Download file from storage
    const { data: fileData, error: fileError } = await supabaseClient.storage
      .from("videos")
      .download(video.storage_path);

    if (fileError || !fileData) {
      throw new Error("Failed to download video file");
    }

    // 3. Update status to processing
    await supabaseClient
      .from("videos")
      .update({ status: "processing" })
      .eq("id", video_id);

    // 4. Send to OpenAI Whisper
    const formData = new FormData();
    formData.append("file", fileData, "video.mp4");
    formData.append("model", "whisper-1");

    const openaiResponse = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
        },
        body: formData,
      }
    );

    const openaiResult = await openaiResponse.json();

    if (openaiResult.error) {
      throw new Error(`OpenAI Error: ${openaiResult.error.message}`);
    }

    const transcription = openaiResult.text;

    // 5. Update video with transcription
    const { error: updateError } = await supabaseClient
      .from("videos")
      .update({
        transcription: transcription,
        status: "completed",
      })
      .eq("id", video_id);

    if (updateError) {
      throw new Error("Failed to update video with transcription");
    }

    return new Response(JSON.stringify({ success: true, transcription }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    // Attempt to set status to failed if possible
    try {
      if (req.method !== "OPTIONS") {
        const { video_id } = await req.json().catch(() => ({}));
        if (video_id) {
          const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
          );
          await supabaseClient
            .from("videos")
            .update({ status: "failed" })
            .eq("id", video_id);
        }
      }
    } catch (e) {
      // ignore
    }

    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
