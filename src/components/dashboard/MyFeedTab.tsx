import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Facebook, Instagram, Filter, RefreshCw, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { CommentsDialog } from './CommentsDialog';

interface PublishedPost {
  id: string;
  media_url: string;
  caption?: string;
  post_type: 'POST' | 'REEL' | 'STORY';
  scheduled_at: string;
  status: 'scheduled' | 'published' | 'failed';
  platform: string;
  fb_post_id?: string;
  created_at: string;
  updated_at: string;
}

type PlatformFilter = 'all' | 'instagram' | 'facebook';

const getPlatformIcon = (platform: string) => {
  const p = platform.toLowerCase();
  
  if (p.includes('facebook')) {
    return <Facebook className="w-5 h-5 text-blue-500" />;
  }
  if (p.includes('instagram')) {
    return <Instagram className="w-5 h-5 text-pink-500" />;
  }
  
  return <span className="text-xs uppercase font-bold text-zinc-400">{platform}</span>;
};

const getPlatformBadgeColor = (platform: string) => {
  const p = platform.toLowerCase();
  
  if (p.includes('facebook')) {
    return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  }
  if (p.includes('instagram')) {
    return 'bg-pink-500/10 text-pink-400 border-pink-500/20';
  }
  
  return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
};

const getPostTypeColor = (postType: string) => {
  switch (postType) {
    case 'POST':
      return 'bg-violet-500/10 text-violet-400 border-violet-500/20';
    case 'REEL':
      return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
    case 'STORY':
      return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
    default:
      return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
  }
};

export function MyFeedTab() {
  const [posts, setPosts] = useState<PublishedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [commentsDialogOpen, setCommentsDialogOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<PublishedPost | null>(null);

  const fetchPublishedPosts = useCallback(async () => {
    try {
      setRefreshing(true);
      let query = supabase
        .from('scheduled_posts')
        .select('*')
        .eq('status', 'published')
        .order('scheduled_at', { ascending: false });

      if (platformFilter !== 'all') {
        query = query.eq('platform', platformFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching published posts:', error);
      } else {
        setPosts(data || []);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [platformFilter]);

  useEffect(() => {
    fetchPublishedPosts();
  }, [platformFilter, fetchPublishedPosts]);

  const filteredPosts = posts;

  return (
    <div className="flex-1 overflow-auto">
      {/* Header with Filters */}
      <div className="sticky top-0 z-10 bg-zinc-950/80 backdrop-blur-xl border-b border-white/5 p-4 mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">My Published Posts</h2>
            <p className="text-sm text-zinc-400 mt-1">
              {filteredPosts.length} {filteredPosts.length === 1 ? 'post' : 'posts'} published
            </p>
          </div>

          {/* Filter Buttons */}
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-zinc-900/50 rounded-lg p-1 border border-white/10">
              <Button
                variant={platformFilter === 'all' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 text-xs"
                onClick={() => setPlatformFilter('all')}
              >
                <Filter className="w-3 h-3 mr-1" />
                All
              </Button>
              <Button
                variant={platformFilter === 'instagram' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 text-xs gap-1"
                onClick={() => setPlatformFilter('instagram')}
              >
                <Instagram className="w-3 h-3" />
                Instagram
              </Button>
              <Button
                variant={platformFilter === 'facebook' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 text-xs gap-1"
                onClick={() => setPlatformFilter('facebook')}
              >
                <Facebook className="w-3 h-3" />
                Facebook
              </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-2"
              onClick={fetchPublishedPosts}
              disabled={refreshing}
            >
              <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 text-violet-500 animate-spin" />
            <p className="text-zinc-400 text-sm">Loading your feed...</p>
          </div>
        </div>
      ) : filteredPosts.length === 0 ? (
        /* Empty State */
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center mx-auto mb-4">
              <Instagram className="w-8 h-8 text-zinc-600" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-300 mb-2">No published posts yet</h3>
            <p className="text-sm text-zinc-500">
              {platformFilter === 'all' 
                ? 'Your published posts will appear here'
                : `No ${platformFilter} posts found`}
            </p>
          </div>
        </div>
      ) : (
        /* Posts Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
          {filteredPosts.map((post, index) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-zinc-900/50 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm hover:bg-zinc-900/80 transition-all duration-300 group"
            >
              {/* Media Preview */}
              <div className="relative aspect-square bg-zinc-800/50 overflow-hidden">
                {post.media_url && (
                  post.media_url.match(/\.(mp4|mov|avi)$/i) ? (
                    <video
                      src={post.media_url}
                      className="w-full h-full object-cover"
                      muted
                    />
                  ) : (
                    <img
                      src={post.media_url}
                      alt={post.caption || 'Post media'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )
                )}
                
                {/* Platform Badge Overlay */}
                <div className="absolute top-3 right-3 flex items-center gap-2">
                  <div className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border backdrop-blur-md",
                    getPlatformBadgeColor(post.platform)
                  )}>
                    {getPlatformIcon(post.platform)}
                  </div>
                </div>

                {/* Post Type Badge */}
                <div className="absolute top-3 left-3">
                  <div className={cn(
                    "px-2.5 py-1 rounded-lg border text-xs font-bold backdrop-blur-md",
                    getPostTypeColor(post.post_type)
                  )}>
                    {post.post_type}
                  </div>
                </div>
              </div>

              {/* Post Details */}
              <div className="p-4 space-y-3">
                {/* Caption */}
                {post.caption && (
                  <p className="text-sm text-zinc-300 line-clamp-3">
                    {post.caption}
                  </p>
                )}

                {/* Metadata */}
                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <div className="flex flex-col">
                    <span className="text-xs text-zinc-500">Published</span>
                    <span className="text-xs font-medium text-zinc-400">
                      {format(new Date(post.scheduled_at), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs text-zinc-500">Time</span>
                    <span className="text-xs font-medium text-zinc-400">
                      {format(new Date(post.scheduled_at), 'h:mm a')}
                    </span>
                  </div>
                  
                  {/* View Comments Button (Facebook only) */}
                  {post.platform.toLowerCase().includes('facebook') && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 text-xs"
                      onClick={() => {
                        setSelectedPost(post);
                        setCommentsDialogOpen(true);
                      }}
                    >
                      <MessageCircle className="w-3 h-3" />
                      Comments
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
      
      {/* Comments Dialog */}
      {selectedPost && (
        <CommentsDialog
          isOpen={commentsDialogOpen}
          onClose={() => {
            setCommentsDialogOpen(false);
            setSelectedPost(null);
          }}
          postId={selectedPost.id}
          fbPostId={selectedPost.fb_post_id || null}
          platform={selectedPost.platform}
        />
      )}
    </div>
  );
}
