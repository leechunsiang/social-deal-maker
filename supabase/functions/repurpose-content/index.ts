import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Format-specific prompts
const FORMAT_PROMPTS = {
  social_post: {
    instructions: `Transform the content into a compelling social media post with these requirements:
- Maximum 280 characters
- Include 2-3 relevant hashtags
- Add a clear call-to-action
- Extract the most engaging/viral point from the content
- Make it suitable for Twitter/X, LinkedIn, or Facebook`,
  },
  instagram_caption: {
    instructions: `Create an engaging Instagram caption with these requirements:
- Maximum 2,200 characters
- Start with an attention-grabbing hook in the first line
- Break into short paragraphs with line breaks for readability
- Include 5-10 relevant hashtags at the end
- Use emojis where appropriate (but not excessive)
- Include a clear call-to-action
- Make it conversational and engaging`,
  },
  quiz: {
    instructions: `Create a quiz based on the content with these requirements:
- 5-10 multiple choice questions (A, B, C, D options)
- Mark the correct answer clearly for each question
- Include a brief explanation for each answer
- Mix difficulty levels (easy, medium, hard)
- Focus on key concepts and facts from the content
- Format each question clearly with the question, options, correct answer, and explanation`,
  },
  infographic: {
    instructions: `Create an infographic script with these requirements:
- Extract 5-7 key statistics, facts, or data points
- Create a catchy, attention-grabbing title
- Use simple, clear language
- Include data points with context/explanation
- Format as: Title → Stat/Fact → Brief explanation
- Make it visually descriptive (describe what would be shown)`,
  },
  blog_post: {
    instructions: `Transform into a blog post with these requirements:
- 500-800 words total
- Catchy, SEO-friendly headline
- Introduction paragraph (hook + preview)
- 3-5 main sections with clear subheadings
- Conclusion with key takeaways
- Use short paragraphs (3-4 sentences each)
- Include natural keyword integration
- Make it SEO-optimized and engaging`,
  },
  video_script: {
    instructions: `Create a 60-90 second video script with these requirements:
- Hook (0-5 seconds): Attention-grabbing opening
- Main content (30-60 seconds): Key points and value
- Call-to-action (5-10 seconds): What viewers should do next
- Use conversational tone
- Include scene descriptions or visual cues in [brackets]
- Make it engaging and suitable for social media videos`,
  },
  key_takeaways: {
    instructions: `Extract key takeaways with these requirements:
- 5-7 main points as bullet list
- One clear sentence per point
- Use action-oriented language
- Easy to scan format
- Focus on most important/actionable insights
- Make each point memorable and practical`,
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { content, generatedImagePath, outputFormat } = await req.json();

    if (
      !outputFormat ||
      !FORMAT_PROMPTS[outputFormat as keyof typeof FORMAT_PROMPTS]
    ) {
      throw new Error("Invalid output format");
    }

    const openAiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAiApiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authenticated user from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error("User not authenticated");
    }

    let contentToRepurpose = content;
    let sourceType = "paste"; // default
    let originalContent = content || "";

    // If generatedImagePath is provided, use Vision API to extract content from the image
    if (generatedImagePath) {
      sourceType = "generated_image";

      // Download image from Supabase Storage
      const { data: imageBlob, error: downloadError } = await supabase.storage
        .from("generated_images")
        .download(generatedImagePath);

      if (downloadError || !imageBlob) {
        throw new Error(
          `Failed to download image: ${
            downloadError?.message || "Unknown error"
          }`
        );
      }

      // Convert Blob to ArrayBuffer then to Base64
      const arrayBuffer = await imageBlob.arrayBuffer();
      const base64Image = encode(arrayBuffer);
      const mimeType = imageBlob.type || "image/png"; // Default to png if unknown

      // Use OpenAI Vision API to analyze the image
      const visionResponse = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openAiApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "Analyze this image and extract all text, data, and key information. Describe what you see in detail, including any text, statistics, concepts, or visual elements that could be used for content creation.",
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:${mimeType};base64,${base64Image}`,
                    },
                  },
                ],
              },
            ],
            max_tokens: 1000,
          }),
        }
      );

      const visionData = await visionResponse.json();
      if (visionData.error) {
        throw new Error(`OpenAI Vision API Error: ${visionData.error.message}`);
      }

      contentToRepurpose = visionData.choices[0].message.content;
      originalContent = contentToRepurpose; // Save the extracted content as original
    }

    if (!contentToRepurpose || contentToRepurpose.trim() === "") {
      throw new Error("No content provided to repurpose");
    }

    // Get format instructions
    const formatConfig =
      FORMAT_PROMPTS[outputFormat as keyof typeof FORMAT_PROMPTS];

    // Call OpenAI API to repurpose content
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an expert content repurposing specialist. ${formatConfig.instructions}\n\nIMPORTANT: Preserve factual accuracy from the original content. Return ONLY the repurposed content without any preamble or meta-commentary.`,
          },
          {
            role: "user",
            content: `Transform the following content:\n\n${contentToRepurpose}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(`OpenAI API Error: ${data.error.message}`);
    }

    const repurposedContent = data.choices[0].message.content;

    // Save to database
    const { error: dbError } = await supabase
      .from("repurposed_content")
      .insert({
        user_id: user.id,
        original_content: originalContent,
        output_format: outputFormat,
        repurposed_content: repurposedContent,
        source_type: sourceType,
        source_image_path: generatedImagePath || null,
      });

    if (dbError) {
      console.error("Error saving to database:", dbError);
      // Don't throw error, still return the result to user
    }

    return new Response(
      JSON.stringify({
        success: true,
        repurposedContent,
        format: outputFormat,
        metadata: {
          characterCount: repurposedContent.length,
          wordCount: repurposedContent.split(/\s+/).length,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in repurpose-content:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to repurpose content",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  }
});
