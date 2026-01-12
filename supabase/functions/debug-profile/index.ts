import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const psid = url.searchParams.get("psid");

    if (!psid) {
      return new Response(JSON.stringify({ error: "Missing PSID" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: lead, error: dbError } = await supabase
      .from("messenger_leads")
      .select("*")
      .eq("psid", psid)
      .single();

    if (dbError) {
      return new Response(`DB_ERROR: ${dbError.message}`, {
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    }

    if (!lead) {
      return new Response(`NO_LEAD_FOUND_FOR_PSID: ${psid}`, {
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    }

    return new Response(
      `DB_RECORD: First=${lead.first_name}, Last=${lead.last_name}, Pic=${
        lead.profile_pic ? "Present" : "Empty"
      }`,
      {
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
