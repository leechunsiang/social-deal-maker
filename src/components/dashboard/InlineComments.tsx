import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, RefreshCw, User, Heart, ChevronDown, ChevronUp, Reply, Send } from 'lucide-react';
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

interface CommentReply {
    id: string;
    fb_reply_id: string;
    message: string;
    created_time: string;
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
    const [replies, setReplies] = useState<Record<string, CommentReply[]>>({});
    const [loading, setLoading] = useState(true);
    const [fetching, setFetching] = useState(false);
    const [expanded, setExpanded] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
    const [replyText, setReplyText] = useState('');
    const [submittingReply, setSubmittingReply] = useState(false);

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

                // Fetch replies for each comment
                const repliesMap: Record<string, CommentReply[]> = {};
                for (const comment of data || []) {
                    const { data: repliesData, error: repliesError } = await supabase
                        .from('comment_replies')
                        .select('*')
                        .eq('comment_id', comment.id)
                        .order('created_time', { ascending: true });

                    if (!repliesError && repliesData) {
                        repliesMap[comment.id] = repliesData;
                    }
                }
                setReplies(repliesMap);
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

    const handleReplySubmit = async (commentId: string) => {
        if (!replyText.trim()) {
            setError('Reply message cannot be empty');
            return;
        }

        try {
            setSubmittingReply(true);
            setError(null);

            const { data, error: invokeError } = await supabase.functions.invoke(
                'reply-to-facebook-comment',
                {
                    body: {
                        comment_id: commentId,
                        reply_message: replyText.trim(),
                    },
                }
            );

            if (invokeError) {
                console.error('Error submitting reply:', invokeError);
                setError('Failed to submit reply');
            } else if (data?.error) {
                console.error('Edge function error:', data.error);
                setError(data.error);
            } else {
                console.log(`Reply posted successfully: ${data.reply_id}`);
                setReplyText('');
                setReplyingToCommentId(null);
                await fetchLatestComments();
            }
        } catch (err) {
            console.error('Error:', err);
            setError('Failed to submit reply');
        } finally {
            setSubmittingReply(false);
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

                                    {/* Reply Button */}
                                    {platform === 'facebook' && (
                                        <div className="pl-9 pt-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 gap-1 text-[10px] text-zinc-400 hover:text-blue-400 px-2"
                                                onClick={() => {
                                                    if (replyingToCommentId === comment.id) {
                                                        setReplyingToCommentId(null);
                                                        setReplyText('');
                                                    } else {
                                                        setReplyingToCommentId(comment.id);
                                                        setReplyText('');
                                                    }
                                                }}
                                            >
                                                <Reply className="w-3 h-3" />
                                                Reply
                                            </Button>
                                        </div>
                                    )}

                                    {/* Reply Form */}
                                    {replyingToCommentId === comment.id && (
                                        <div className="pl-9 space-y-2 border-t border-white/5 pt-2 mt-2">
                                            <Textarea
                                                value={replyText}
                                                onChange={(e) => setReplyText(e.target.value)}
                                                placeholder="Write your reply..."
                                                className="min-h-[60px] bg-zinc-800/50 border-white/10 text-white text-xs placeholder:text-zinc-500 resize-none"
                                                disabled={submittingReply}
                                            />
                                            <div className="flex gap-2 justify-end">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 text-[10px]"
                                                    onClick={() => {
                                                        setReplyingToCommentId(null);
                                                        setReplyText('');
                                                    }}
                                                    disabled={submittingReply}
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    variant="default"
                                                    size="sm"
                                                    className="h-6 gap-1 text-[10px] bg-blue-600 hover:bg-blue-700"
                                                    onClick={() => handleReplySubmit(comment.id)}
                                                    disabled={submittingReply || !replyText.trim()}
                                                >
                                                    {submittingReply ? (
                                                        <>
                                                            <RefreshCw className="w-3 h-3 animate-spin" />
                                                            Sending...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Send className="w-3 h-3" />
                                                            Send
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Display Existing Replies */}
                                    {replies[comment.id] && replies[comment.id].length > 0 && (
                                        <div className="pl-9 mt-2 space-y-2">
                                            {replies[comment.id].map((reply) => (
                                                <div
                                                    key={reply.id}
                                                    className="bg-zinc-700/20 border border-white/5 rounded-lg p-2 space-y-1"
                                                >
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="text-[10px] font-semibold text-blue-300">Your reply:</span>
                                                        <span className="text-[9px] text-zinc-500">
                                                            {format(new Date(reply.created_time), 'MMM d · h:mm a')}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-zinc-200 whitespace-pre-wrap">
                                                        {reply.message}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
