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
    console.log("Fetch Comments Request:", JSON.stringify(body));
    const { post_id, fb_post_id } = body;

    if (!post_id || !fb_post_id) {
      throw new Error("Missing required parameters: post_id and fb_post_id");
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

    console.log(`Fetching comments for Facebook post: ${fb_post_id}`);

    // Fetch comments from Facebook Graph API with replies
    const params = new URLSearchParams({
      access_token: fbAccessToken,
      fields:
        "id,from,message,created_time,like_count,comments{id,from,message,created_time,like_count}",
      limit: "100", // Fetch up to 100 comments
    });

    const endpoint = `https://graph.facebook.com/v20.0/${fb_post_id}/comments?${params.toString()}`;
    const response = await fetch(endpoint);
    const data = await response.json();

    if (data.error) {
      console.error("Facebook API Error:", data.error);
      throw new Error(`Facebook API Error: ${data.error.message}`);
    }

    console.log(`Fetched ${data.data?.length || 0} comments from Facebook`);

    // Debug: Log the first comment to see structure
    if (data.data && data.data.length > 0) {
      console.log(
        "First comment structure:",
        JSON.stringify(data.data[0], null, 2)
      );
    }

    // Store comments in database
    const comments = data.data || [];
    const insertedComments = [];

    for (const comment of comments) {
      const { error: insertError } = await supabase
        .from("post_comments")
        .upsert(
          {
            post_id: post_id,
            fb_comment_id: comment.id,
            author_name: comment.from?.name || "Unknown",
            author_id: comment.from?.id || "",
            message: comment.message || "",
            created_time: comment.created_time,
            like_count: comment.like_count || 0,
            fetched_at: new Date().toISOString(),
          },
          {
            onConflict: "fb_comment_id",
          }
        );

      if (insertError) {
        console.error(`Error inserting comment ${comment.id}:`, insertError);
      } else {
        insertedComments.push(comment.id);

        // Process replies to this comment
        const replies = comment.comments?.data || [];
        if (replies.length > 0) {
          // Get the database comment id
          const { data: commentData, error: commentError } = await supabase
            .from("post_comments")
            .select("id")
            .eq("fb_comment_id", comment.id)
            .single();

          if (!commentError && commentData) {
            for (const reply of replies) {
              const { error: replyError } = await supabase
                .from("comment_replies")
                .upsert(
                  {
                    comment_id: commentData.id,
                    fb_reply_id: reply.id,
                    message: reply.message || "",
                    created_time: reply.created_time,
                  },
                  {
                    onConflict: "fb_reply_id",
                  }
                );

              if (replyError) {
                console.error(`Error inserting reply ${reply.id}:`, replyError);
              }
            }
            console.log(
              `Stored ${replies.length} replies for comment ${comment.id}`
            );
          }
        }
      }
    }

    console.log(
      `Successfully stored ${insertedComments.length} comments in database`
    );

    return new Response(
      JSON.stringify({
        success: true,
        comments_count: comments.length,
        stored_count: insertedComments.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Fetch Comments Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
