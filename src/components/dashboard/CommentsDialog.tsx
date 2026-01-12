import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, RefreshCw, User, Heart, Reply, Send } from 'lucide-react';
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

interface CommentsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  fbPostId: string | null;
  platform: string;
}

export function CommentsDialog({ isOpen, onClose, postId, fbPostId, platform }: CommentsDialogProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
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
      setError('Cannot fetch comments for this post');
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
        // Reload comments from database
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
        // Clear reply form
        setReplyText('');
        setReplyingToCommentId(null);
        // Refresh comments to fetch the new reply
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
      if (!isOpen) return;
      
      // First, load comments from database
      await loadComments();
      
      // If we're on Facebook and have fb_post_id, automatically fetch latest comments
      if (platform === 'facebook' && fbPostId) {
        fetchLatestComments();
      }
    };
    
    initComments();
  }, [isOpen, postId]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-950 border-white/10 text-white sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-blue-400" />
            Comments ({comments.length})
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {platform === 'facebook' 
              ? 'Comments from your Facebook post'
              : 'Comments are only available for Facebook posts'}
          </DialogDescription>
        </DialogHeader>

        {/* Refresh Button */}
        {platform === 'facebook' && fbPostId && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchLatestComments}
              disabled={fetching}
              className="gap-2"
            >
              <RefreshCw className={cn("w-4 h-4", fetching && "animate-spin")} />
              {fetching ? 'Fetching...' : 'Fetch Latest'}
            </Button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="w-6 h-6 text-violet-500 animate-spin" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2">
              <p className="text-red-400 text-sm">{error}</p>
              <Button variant="outline" size="sm" onClick={loadComments}>
                Retry
              </Button>
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2">
              <MessageCircle className="w-12 h-12 text-zinc-600" />
              <p className="text-zinc-400 text-sm">No comments yet</p>
              {platform === 'facebook' && fbPostId && (
                <Button variant="outline" size="sm" onClick={fetchLatestComments}>
                  Fetch Comments
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="bg-zinc-900/50 border border-white/5 rounded-lg p-4 space-y-2"
                >
                  {/* Author Info */}
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <User className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-200">
                        {comment.author_name}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {format(new Date(comment.created_time), 'MMM d, yyyy · h:mm a')}
                      </p>
                    </div>
                  </div>

                  {/* Comment Message */}
                  <p className="text-sm text-zinc-300 whitespace-pre-wrap">
                    {comment.message}
                  </p>

                  {/* Like Count & Reply Button */}
                  <div className="flex items-center justify-between pt-2">
                    {comment.like_count > 0 && (
                      <div className="flex items-center gap-1 text-zinc-500">
                        <Heart className="w-3 h-3" />
                        <span className="text-xs">{comment.like_count}</span>
                      </div>
                    )}
                    
                    {platform === 'facebook' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1.5 text-xs text-zinc-400 hover:text-blue-400"
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
                    )}
                  </div>

                  {/* Reply Form */}
                  {replyingToCommentId === comment.id && (
                    <div className="mt-3 space-y-2 border-t border-white/5 pt-3">
                      <Textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Write your reply..."
                        className="min-h-[80px] bg-zinc-800/50 border-white/10 text-white placeholder:text-zinc-500 resize-none"
                        disabled={submittingReply}
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
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
                          onClick={() => handleReplySubmit(comment.id)}
                          disabled={submittingReply || !replyText.trim()}
                          className="gap-1.5 bg-blue-600 hover:bg-blue-700"
                        >
                          {submittingReply ? (
                            <>
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Send className="w-3 h-3" />
                              Send Reply
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
