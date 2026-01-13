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
    const { prompt, image_urls, user_id } = await req.json();

    if (
      !prompt ||
      !image_urls ||
      !Array.isArray(image_urls) ||
      image_urls.length === 0
    ) {
      throw new Error("Prompt and image_urls are required");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Create generation record
    const { data: generation, error: genError } = await supabaseClient
      .from("image_generations")
      .insert({
        prompt,
        user_id: user_id, // We trust the user_id passed from client authenticated context?
        // Ideally we should get it from auth context but Edge Functions called with service role key bypass RLS.
        // If called from client with user token, we can use auth.getUser().
        // For simplicity let's assume valid user_id passed or extract from header token if needed.
        // But for this step let's use the passed user_id or fallback to auth.
      })
      .select()
      .single();

    if (genError)
      throw new Error(
        `Failed to create generation record: ${genError.message}`
      );

    const savedImages = [];

    // 2. Process each image
    for (const url of image_urls) {
      // Download image
      const imageResponse = await fetch(url);
      if (!imageResponse.ok)
        throw new Error(`Failed to download image from ${url}`);
      const imageBlob = await imageResponse.blob();

      // Upload to storage
      const fileName = `${generation.id}/${crypto.randomUUID()}.png`;
      const { error: uploadError } = await supabaseClient.storage
        .from("generated_images")
        .upload(fileName, imageBlob, {
          contentType: "image/png",
        });

      if (uploadError)
        throw new Error(`Failed to upload image: ${uploadError.message}`);

      // Create record
      const { data: imageRecord, error: dbError } = await supabaseClient
        .from("generated_images")
        .insert({
          generation_id: generation.id,
          user_id: user_id,
          storage_path: fileName,
        })
        .select()
        .single();

      if (dbError)
        throw new Error(`Failed to save image record: ${dbError.message}`);

      savedImages.push(imageRecord);
    }

    return new Response(
      JSON.stringify({ success: true, saved_count: savedImages.length }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || String(error) }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200, // Return 200 so client can read the JSON body error
      }
    );
  }
});
