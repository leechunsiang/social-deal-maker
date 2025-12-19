
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus, Image as ImageIcon, Video, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ScheduledPost {
  id: string;
  media_url: string;
  post_type: 'POST' | 'REEL' | 'STORY';
  scheduled_at: string;
  status: 'scheduled' | 'published' | 'failed';
  caption?: string; 
}

interface DayDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  posts: ScheduledPost[];
  onAddEvent: () => void;
}

export function DayDetailsDialog({ isOpen, onClose, date, posts, onAddEvent }: DayDetailsDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-950 border-white/10 text-white sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-violet-500" />
              {format(date, 'MMMM d, yyyy')}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {posts.length} {posts.length === 1 ? 'post' : 'posts'} scheduled for this day.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-4 max-h-[60vh] overflow-y-auto">
            {posts.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 border-2 border-dashed border-zinc-800 rounded-lg">
                    <p>No posts scheduled.</p>
                </div>
            ) : (
                posts.map(post => (
                    <div key={post.id} className="flex gap-3 p-3 rounded-lg bg-zinc-900 border border-white/5 hover:border-white/10 transition-colors">
                        {/* Thumbnail */}
                        <div className="h-16 w-16 shrink-0 rounded bg-black border border-white/10 overflow-hidden flex items-center justify-center">
                            {post.media_url && !post.media_url.includes('.mp4') ? (
                                <img src={post.media_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                                <Video className="h-8 w-8 text-zinc-700" />
                            )}
                        </div>
                        
                        {/* Details */}
                        <div className="flex flex-col justify-between flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                                <span className={cn(
                                    "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider",
                                    post.post_type === 'STORY' ? "bg-pink-500/20 text-pink-400" :
                                    post.post_type === 'REEL' ? "bg-blue-500/20 text-blue-400" :
                                    "bg-violet-500/20 text-violet-400"
                                )}>
                                    {post.post_type}
                                </span>
                                <span className={cn(
                                    "text-[10px] uppercase font-bold",
                                    post.status === 'published' ? "text-green-500" :
                                    post.status === 'failed' ? "text-red-500" :
                                    "text-yellow-500"
                                )}>
                                    {post.status}
                                </span>
                            </div>
                            <p className="text-sm text-zinc-300 truncate font-medium">
                                {post.caption || 'No caption'}
                            </p>
                            <p className="text-xs text-zinc-500">
                                {format(new Date(post.scheduled_at), 'h:mm a')}
                            </p>
                        </div>
                    </div>
                ))
            )}
        </div>

        <div className="flex justify-end">
            <Button onClick={onAddEvent} className="w-full gap-2 bg-white text-black hover:bg-zinc-200">
                <Plus className="h-4 w-4" />
                Schedule New Post
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
