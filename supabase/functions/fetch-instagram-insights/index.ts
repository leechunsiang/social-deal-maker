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
        console.log("Fetch Instagram Insights Request:", JSON.stringify(body));
        const { post_id, ig_post_id } = body;

        if (!post_id || !ig_post_id) {
            throw new Error("Missing required parameters: post_id and ig_post_id");
        }

        // Initialize Supabase client
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Get Instagram access token
        const igAccessToken = Deno.env.get("IG_ACCESS_TOKEN");

        if (!igAccessToken) {
            throw new Error("Missing Instagram credentials (IG_ACCESS_TOKEN).");
        }

        console.log(`Fetching insights for Instagram post: ${ig_post_id}`);

        // Fetch insights from Instagram Graph API
        // Available metrics: likes, comments, shares, saved, reach, impressions
        const params = new URLSearchParams({
            access_token: igAccessToken,
            metric: "likes,comments,shares,saved",
        });

        const endpoint = `https://graph.instagram.com/v24.0/${ig_post_id}/insights?${params.toString()}`;
        const response = await fetch(endpoint);
        const data = await response.json();

        if (data.error) {
            console.error("Instagram API Error:", data.error);
            throw new Error(`Instagram API Error: ${data.error.message}`);
        }

        console.log("Instagram Insights Response:", JSON.stringify(data));

        // Parse the insights data
        const insights = data.data || [];
        const analytics: any = {
            likes_count: 0,
            comments_count: 0,
            shares_count: 0,
            saved_count: 0,
        };

        insights.forEach((insight: any) => {
            const metricName = insight.name;
            const value = insight.values?.[0]?.value || 0;

            switch (metricName) {
                case "likes":
                    analytics.likes_count = value;
                    break;
                case "comments":
                    analytics.comments_count = value;
                    break;
                case "shares":
                    analytics.shares_count = value;
                    break;
                case "saved":
                    analytics.saved_count = value;
                    break;
            }
        });

        console.log("Parsed Analytics:", analytics);

        // Store/update analytics in database
        const { error: upsertError } = await supabase
            .from("post_analytics")
            .upsert(
                {
                    post_id: post_id,
                    platform: "instagram",
                    platform_post_id: ig_post_id,
                    likes_count: analytics.likes_count,
                    comments_count: analytics.comments_count,
                    shares_count: analytics.shares_count,
                    saved_count: analytics.saved_count,
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

        console.log("Successfully stored Instagram insights in database");

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
        console.error("Fetch Instagram Insights Error:", error);
        return new Response(JSON.stringify({ error: (error as Error).message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });
    }
});
