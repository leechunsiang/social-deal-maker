import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  const logs: string[] = [];
  const log = (msg: string) => {
    console.log(msg);
    logs.push(msg);
  };
  const errorLog = (msg: string, err?: any) => {
    console.error(msg, err);
    logs.push(`ERROR: ${msg} ${err ? JSON.stringify(err) : ""}`);
  };

  try {
    // 1. Get due posts
    // We use 'lte' (less than or equal) to current time.
    // And 'status' must be 'scheduled'.
    const now = new Date().toISOString();
    log(`Checking for posts due before ${now}... (Version: Debug-Enhanced)`);

    const { data: posts, error } = await supabase
      .from("scheduled_posts")
      .select("*")
      .eq("status", "scheduled")
      .lte("scheduled_at", now);

    if (error) {
      errorLog("DB Error", error);
      throw error;
    }

    log(`Found ${posts.length} posts due.`);

    const results = [];

    // 2. Process each post
    for (const post of posts) {
      log(`Processing post ${post.id}...`);
      try {
        // Prepare payload
        const payload = {
          post_id: post.id,
          caption: post.caption,
          post_type: post.post_type,
          media_url: post.media_url,
          media_urls: post.media_urls,
        };

        const targetFunction =
          post.platform === "facebook"
            ? "publish-facebook-post"
            : "publish-instagram-post";

        log(`Invoking ${targetFunction} for post ${post.id}...`);

        // Invoke publish function
        const { data: publishData, error: publishError } =
          await supabase.functions.invoke(targetFunction, {
            body: payload,
          });

        if (publishError) {
          const errorDetails =
            publishError instanceof Error
              ? publishError.message
              : JSON.stringify(publishError);
          const fullContext = JSON.stringify(
            publishError,
            Object.getOwnPropertyNames(publishError)
          );
          errorLog(`Publish Invoke Error for ${post.id}`, publishError);
          throw new Error(`Invoke Failed: ${errorDetails} ::: ${fullContext}`);
        }

        if (publishData && publishData.error) {
          errorLog(`Publish Function Error for ${post.id}`, publishData.error);
          throw new Error(publishData.error);
        }

        log(
          `Post ${post.id} published successfully! Container ID: ${publishData.id}`
        );

        // Update status to published
        const { error: updateError } = await supabase
          .from("scheduled_posts")
          .update({
            status: "published",
            instagram_container_id: publishData.id,
            // Could add a 'published_at' column
          })
          .eq("id", post.id);

        if (updateError) {
          errorLog("Failed to update status published", updateError);
        }

        results.push({
          id: post.id,
          status: "published",
          container_id: publishData.id,
        });
      } catch (err) {
        errorLog(`Failed to process post ${post.id}`, err);

        // Update status to failed
        await supabase
          .from("scheduled_posts")
          .update({
            status: "failed",
            error_message: err.message || JSON.stringify(err),
          })
          .eq("id", post.id);

        results.push({ id: post.id, status: "failed", error: err.message });
      }
    }

    return new Response(JSON.stringify({ results, logs }, null, 2), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    errorLog("Cron Job Failed", err);
    return new Response(JSON.stringify({ error: err.message, logs }, null, 2), {
      status: 500,
    });
  }
});
