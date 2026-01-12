import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

interface DashboardStats {
  totalLikes: number;
  totalComments: number;
  publishedPosts: number;
  scheduledPosts: number;
}

interface ActivityItem {
  id: string;
  type: "post";
  platform: "instagram" | "facebook";
  status: string;
  thumbnail?: string;
  caption?: string;
  time: string;
}

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats>({
    totalLikes: 0,
    totalComments: 0,
    publishedPosts: 0,
    scheduledPosts: 0,
  });
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        setIsLoading(true);

        // 1. Fetch Posts Stats
        const { data: posts, error: postsError } = await supabase
          .from("scheduled_posts")
          .select("*")
          .order("created_at", { ascending: false });

        if (postsError) throw postsError;

        const published = posts?.filter((p) => p.status === "published") || [];
        const scheduled = posts?.filter((p) => p.status === "scheduled") || [];

        // 2. Fetch Analytics
        const { data: analytics, error: analyticsError } = await supabase
          .from("post_analytics")
          .select("likes_count, comments_count");

        if (analyticsError) throw analyticsError;

        const totalLikes =
          analytics?.reduce((sum, item) => sum + (item.likes_count || 0), 0) ||
          0;
        const totalComments =
          analytics?.reduce(
            (sum, item) => sum + (item.comments_count || 0),
            0
          ) || 0;

        setStats({
          totalLikes,
          totalComments,
          publishedPosts: published.length,
          scheduledPosts: scheduled.length,
        });

        // 3. Format Recent Activity
        const refinedRecent =
          posts?.slice(0, 5).map((post) => {
            const platform: "instagram" | "facebook" =
              post.instagram_container_id ? "instagram" : "facebook"; // Infer platform

            return {
              id: post.id,
              type: "post" as const,
              platform,
              status: post.status,
              thumbnail: post.media_url,
              caption: post.caption,
              time: new Date(post.created_at).toLocaleDateString(),
            };
          }) || [];

        setRecentActivity(refinedRecent);
      } catch (err) {
        console.error("Error fetching dashboard stats:", err);
        setError("Failed to load dashboard statistics");
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, []);

  return { stats, recentActivity, isLoading, error };
}
