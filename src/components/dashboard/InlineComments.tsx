import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle, RefreshCw, User, Heart, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Comment {
    id: string;
    fb_comment_id: string;
    author_name: string;
    author_id: string;
    message: string;
    created_time: string;
    like_count: number;
    fetched_at: string;
}

interface InlineCommentsProps {
    postId: string;
    fbPostId: string | null;
    igPostId?: string | null;
    platform: string;
    autoFetch?: boolean;
}

export function InlineComments({ postId, fbPostId, igPostId, platform, autoFetch = true }: InlineCommentsProps) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [fetching, setFetching] = useState(false);
    const [expanded, setExpanded] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadComments = async () => {
        try {
            setLoading(true);
            setError(null);

            const { data, error: fetchError } = await supabase
                .from('post_comments')
                .select('*')
                .eq('post_id', postId)
                .order('created_time', { ascending: false });

            if (fetchError) {
                console.error('Error loading comments:', fetchError);
                setError('Failed to load comments');
            } else {
                setComments(data || []);
            }
        } catch (err) {
            console.error('Error:', err);
            setError('Failed to load comments');
        } finally {
            setLoading(false);
        }
    };

    const fetchLatestComments = async () => {
        if (!fbPostId || platform !== 'facebook') {
            return;
        }

        try {
            setFetching(true);
            setError(null);

            const { data, error: invokeError } = await supabase.functions.invoke(
                'fetch-facebook-comments',
                {
                    body: {
                        post_id: postId,
                        fb_post_id: fbPostId,
                    },
                }
            );

            if (invokeError) {
                console.error('Error fetching comments:', invokeError);
                setError('Failed to fetch latest comments');
            } else if (data?.error) {
                console.error('Edge function error:', data.error);
                setError(data.error);
            } else {
                console.log(`Fetched ${data.comments_count} comments from Facebook`);
                await loadComments();
            }
        } catch (err) {
            console.error('Error:', err);
            setError('Failed to fetch latest comments');
        } finally {
            setFetching(false);
        }
    };

    useEffect(() => {
        const initComments = async () => {
            await loadComments();

            if (autoFetch && platform === 'facebook' && fbPostId) {
                fetchLatestComments();
            }
        };

        initComments();
    }, [postId]);

    // Instagram doesn't support comment fetching via API
    if (platform.toLowerCase() === 'instagram') {
        return (
            <div className="border-t border-white/5 pt-4 mt-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
                        <MessageCircle className="w-4 h-4" />
                        <span>Comments</span>
                    </div>
                </div>
                <div className="flex flex-col items-center justify-center py-8 gap-2 bg-zinc-900/30 border border-white/5 rounded-lg">
                    <MessageCircle className="w-8 h-8 text-zinc-600" />
                    <p className="text-zinc-400 text-xs text-center max-w-xs">
                        Instagram comments are visible on Instagram.
                        <br />
                        Comment count is shown in the Engagement section above.
                    </p>
                </div>
            </div>
        );
    }

    if (platform !== 'facebook') {
        return null;
    }

    return (
        <div className="border-t border-white/5 pt-4 mt-4">
            {/* Comments Header */}
            <div className="flex items-center justify-between mb-3">
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="flex items-center gap-2 text-sm font-semibold text-zinc-300 hover:text-white transition-colors"
                >
                    <MessageCircle className="w-4 h-4" />
                    <span>Comments ({comments.length})</span>
                    {expanded ? (
                        <ChevronUp className="w-4 h-4" />
                    ) : (
                        <ChevronDown className="w-4 h-4" />
                    )}
                </button>

                {fbPostId && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={fetchLatestComments}
                        disabled={fetching}
                        className="h-7 gap-1.5 text-xs"
                    >
                        <RefreshCw className={cn("w-3 h-3", fetching && "animate-spin")} />
                        {fetching ? 'Fetching...' : 'Refresh'}
                    </Button>
                )}
            </div>

            {/* Comments List */}
            {expanded && (
                <div className="space-y-3">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <RefreshCw className="w-5 h-5 text-violet-500 animate-spin" />
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-2">
                            <p className="text-red-400 text-xs">{error}</p>
                            <Button variant="outline" size="sm" onClick={loadComments} className="h-7 text-xs">
                                Retry
                            </Button>
                        </div>
                    ) : comments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-2">
                            <MessageCircle className="w-8 h-8 text-zinc-600" />
                            <p className="text-zinc-500 text-xs">No comments yet</p>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                            {comments.map((comment) => (
                                <div
                                    key={comment.id}
                                    className="bg-zinc-800/30 border border-white/5 rounded-lg p-3 space-y-2"
                                >
                                    {/* Author Info */}
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                                            <User className="w-3.5 h-3.5 text-blue-400" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-semibold text-zinc-200 truncate">
                                                {comment.author_name}
                                            </p>
                                            <p className="text-[10px] text-zinc-500">
                                                {format(new Date(comment.created_time), 'MMM d, yyyy · h:mm a')}
                                            </p>
                                        </div>
                                        {comment.like_count > 0 && (
                                            <div className="flex items-center gap-1 text-zinc-500">
                                                <Heart className="w-3 h-3" />
                                                <span className="text-xs">{comment.like_count}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Comment Message */}
                                    <p className="text-xs text-zinc-300 whitespace-pre-wrap pl-9">
                                        {comment.message}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
