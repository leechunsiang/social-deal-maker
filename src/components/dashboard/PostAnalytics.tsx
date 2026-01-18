import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, Share2, Bookmark, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '@/lib/utils';

interface PostAnalyticsData {
    likes_count: number;
    comments_count: number;
    shares_count?: number;
    saved_count?: number;
}

interface PostAnalyticsProps {
    postId: string;
    platform: string;
    platformPostId: string | null;
    autoFetch?: boolean;
}

export function PostAnalytics({ postId, platform, platformPostId, autoFetch = true }: PostAnalyticsProps) {
    const [analytics, setAnalytics] = useState<PostAnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [fetching, setFetching] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadAnalytics = async () => {
        try {
            setLoading(true);
            setError(null);

            const { data, error: fetchError } = await supabase
                .from('post_analytics')
                .select('*')
                .eq('post_id', postId)
                .eq('platform', platform.toLowerCase())
                .single();

            if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
                console.error('Error loading analytics:', fetchError);
                setError('Failed to load analytics');
            } else if (data) {
                setAnalytics({
                    likes_count: data.likes_count || 0,
                    comments_count: data.comments_count || 0,
                    shares_count: data.shares_count || 0,
                    saved_count: data.saved_count || 0,
                });
            }
        } catch (err) {
            console.error('Error:', err);
            setError('Failed to load analytics');
        } finally {
            setLoading(false);
        }
    };

    const fetchLatestAnalytics = async () => {
        if (!platformPostId) {
            setError('Post ID not available');
            return;
        }

        try {
            setFetching(true);
            setError(null);

            const functionName = platform.toLowerCase() === 'instagram'
                ? 'fetch-instagram-insights'
                : 'fetch-facebook-insights';

            const bodyKey = platform.toLowerCase() === 'instagram' ? 'ig_post_id' : 'fb_post_id';

            const { data, error: invokeError } = await supabase.functions.invoke(
                functionName,
                {
                    body: {
                        post_id: postId,
                        [bodyKey]: platformPostId,
                    },
                }
            );

            if (invokeError) {
                console.error('Error fetching analytics:', invokeError);
                setError('Failed to fetch latest analytics');
            } else if (data?.error) {
                console.error('Edge function error:', data.error);
                setError(data.error);
            } else if (data?.analytics) {
                setAnalytics(data.analytics);
            } else {
                // Reload from database
                await loadAnalytics();
            }
        } catch (err) {
            console.error('Error:', err);
            setError('Failed to fetch latest analytics');
        } finally {
            setFetching(false);
        }
    };

    useEffect(() => {
        const initAnalytics = async () => {
            await loadAnalytics();

            if (autoFetch && platformPostId) {
                fetchLatestAnalytics();
            }
        };

        initAnalytics();
    }, [postId]);

    if (!platformPostId && !analytics) {
        return null; // Don't show analytics if there's no platform post ID and no cached data
    }

    return (
        <div className="border-t border-white/5 pt-3 mt-3">
            {/* Analytics Header */}
            <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                    Engagement
                </h4>

                {platformPostId && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={fetchLatestAnalytics}
                        disabled={fetching || loading}
                        className="h-6 gap-1.5 text-[10px] px-2"
                    >
                        <RefreshCw className={cn("w-3 h-3", (fetching || loading) && "animate-spin")} />
                        {fetching ? 'Fetching...' : 'Refresh'}
                    </Button>
                )}
            </div>

            {/* Analytics Stats */}
            {loading && !analytics ? (
                <div className="flex items-center justify-center py-4">
                    <RefreshCw className="w-4 h-4 text-violet-500 animate-spin" />
                </div>
            ) : error && !analytics ? (
                <div className="text-center py-2">
                    <p className="text-red-400 text-[10px]">{error}</p>
                </div>
            ) : analytics ? (
                <div className="grid grid-cols-2 gap-3">
                    {/* Likes */}
                    <div className="flex items-center gap-2 bg-zinc-800/30 border border-white/5 rounded-lg px-3 py-2">
                        <Heart className="w-4 h-4 text-red-400 flex-shrink-0" />
                        <div className="min-w-0">
                            <p className="text-xs text-zinc-500">Likes</p>
                            <p className="text-sm font-bold text-white">{analytics.likes_count.toLocaleString()}</p>
                        </div>
                    </div>

                    {/* Comments */}
                    <div className="flex items-center gap-2 bg-zinc-800/30 border border-white/5 rounded-lg px-3 py-2">
                        <MessageCircle className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        <div className="min-w-0">
                            <p className="text-xs text-zinc-500">Comments</p>
                            <p className="text-sm font-bold text-white">{analytics.comments_count.toLocaleString()}</p>
                        </div>
                    </div>

                    {/* Shares (if available) */}
                    {(analytics.shares_count ?? 0) > 0 && (
                        <div className="flex items-center gap-2 bg-zinc-800/30 border border-white/5 rounded-lg px-3 py-2">
                            <Share2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                            <div className="min-w-0">
                                <p className="text-xs text-zinc-500">Shares</p>
                                <p className="text-sm font-bold text-white">{(analytics.shares_count ?? 0).toLocaleString()}</p>
                            </div>
                        </div>
                    )}

                    {/* Saved (Instagram only) */}
                    {platform.toLowerCase() === 'instagram' && (analytics.saved_count ?? 0) > 0 && (
                        <div className="flex items-center gap-2 bg-zinc-800/30 border border-white/5 rounded-lg px-3 py-2">
                            <Bookmark className="w-4 h-4 text-amber-400 flex-shrink-0" />
                            <div className="min-w-0">
                                <p className="text-xs text-zinc-500">Saved</p>
                                <p className="text-sm font-bold text-white">{(analytics.saved_count ?? 0).toLocaleString()}</p>
                            </div>
                        </div>
                    )}
                </div>
            ) : null}
        </div>
    );
}
