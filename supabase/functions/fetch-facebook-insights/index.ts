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
        console.log("Fetch Facebook Insights Request:", JSON.stringify(body));
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
            Deno.env.get("FB_ACCESS_TOKEN") || Deno.env.get("FACEBOOK_ACCESS_TOKEN");

        if (!fbAccessToken) {
            throw new Error(
                "Missing Facebook credentials (FB_ACCESS_TOKEN/FACEBOOK_ACCESS_TOKEN)."
            );
        }

        console.log(`Fetching insights for Facebook post: ${fb_post_id}`);

        // Fetch insights from Facebook Graph API
        // Note: Photo posts use 'likes' field, not 'reactions'
        const params = new URLSearchParams({
            access_token: fbAccessToken,
            fields: "likes.summary(true),comments.summary(true)",
        });

        const endpoint = `https://graph.facebook.com/v20.0/${fb_post_id}?${params.toString()}`;
        const response = await fetch(endpoint);
        const data = await response.json();

        if (data.error) {
            console.error("Facebook API Error:", data.error);
            throw new Error(`Facebook API Error: ${data.error.message}`);
        }

        console.log("Facebook Insights Response:", JSON.stringify(data));

        // Parse the insights data
        // Photo posts use 'likes' instead of 'reactions'
        const analytics = {
            likes_count: data.likes?.summary?.total_count || 0,
            comments_count: data.comments?.summary?.total_count || 0,
            shares_count: 0, // Not available for Photo posts
        };

        console.log("Parsed Analytics:", analytics);

        // Store/update analytics in database
        const { error: upsertError } = await supabase
            .from("post_analytics")
            .upsert(
                {
                    post_id: post_id,
                    platform: "facebook",
                    platform_post_id: fb_post_id,
                    likes_count: analytics.likes_count,
                    comments_count: analytics.comments_count,
                    shares_count: analytics.shares_count,
                    fetched_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                },
                {
                    onConflict: "post_id,platform",
                }
            );

        if (upsertError) {
            console.error("Error upserting analytics:", upsertError);
            throw new Error(`Database Error: ${upsertError.message}`);
        }

        console.log("Successfully stored Facebook insights in database");

        return new Response(
            JSON.stringify({
                success: true,
                analytics: analytics,
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            }
        );
    } catch (error) {
        console.error("Fetch Facebook Insights Error:", error);
        return new Response(JSON.stringify({ error: (error as Error).message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });
    }
});
