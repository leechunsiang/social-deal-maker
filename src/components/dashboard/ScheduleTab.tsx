
import { supabase } from '../../lib/supabase';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus, Facebook, Instagram, Linkedin, Twitter, Clock } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { DayDetailsDialog } from './DayDetailsDialog';
import { SchedulePostDialog } from './SchedulePostDialog';

interface ScheduledPost {
  id: string;
  media_url: string;
  post_type: 'POST' | 'REEL' | 'STORY';
  scheduled_at: string;
  status: 'scheduled' | 'published' | 'failed';
  caption?: string;
  platform?: string;
}

const getPlatformIcon = (platform?: string) => {
  if (!platform) return null;
  const p = platform.toLowerCase();
  
  if (p.includes('facebook')) return <Facebook className="w-3 h-3" />;
  if (p.includes('instagram')) return <Instagram className="w-3 h-3" />;
  if (p.includes('linkedin')) return <Linkedin className="w-3 h-3" />;
  if (p.includes('twitter') || p.includes('x')) return <Twitter className="w-3 h-3" />;
  
  return <span className="text-[9px] uppercase font-bold">{platform.substring(0, 2)}</span>;
};

const POST_COLORS = [
    'bg-pink-500 text-white border-pink-600',
    'bg-purple-500 text-white border-purple-600', 
    'bg-indigo-500 text-white border-indigo-600',
    'bg-cyan-600 text-white border-cyan-700',
    'bg-teal-500 text-white border-teal-600',
    'bg-rose-500 text-white border-rose-600',
    'bg-orange-500 text-white border-orange-600',
];

const getPostColor = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % POST_COLORS.length;
    return POST_COLORS[index];
};

export default function ScheduleTab() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  
  const [isDialogOpen, setIsDialogOpen] = useState(false); // For SchedulePostDialog
  const [isDetailsOpen, setIsDetailsOpen] = useState(false); // For DayDetailsDialog
  
  const [posts, setPosts] = useState<ScheduledPost[]>([]);

       const onDateClick = (d: Date) => {
          setSelectedDate(d);
          if (view === 'month' && date && !isSameMonth(d, date)) {
              setDate(d);
          }
       };

       const onDateDoubleClick = (d: Date) => {
          setSelectedDate(d);
          setIsDetailsOpen(true);
       };

    
  // Navigation
  const handlePrev = () => {
    if (!date) return;
    if (view === 'month') setDate(subMonths(date, 1));
    if (view === 'week') setDate(subWeeks(date, 1));
    if (view === 'day') setDate(subDays(date, 1));
  };

  const handleNext = () => {
    if (!date) return;
    if (view === 'month') setDate(addMonths(date, 1));
    if (view === 'week') setDate(addWeeks(date, 1));
    if (view === 'day') setDate(addDays(date, 1));
  };

  // Label
  const getDateLabel = () => {
      if (!date) return 'Select Date';
      if (view === 'month') return format(date, 'MMMM yyyy');
      if (view === 'week') {
          const start = startOfWeek(date);
          const end = endOfWeek(date);
          // If same month
          if (isSameMonth(start, end)) return format(date, 'MMMM yyyy');
          return `${format(start, 'MMM')} - ${format(end, 'MMM yyyy')}`;
      }
      if (view === 'day') return format(date, 'MMMM d, yyyy');
      return '';
  };

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from('scheduled_posts')
      .select('*');
      
    if (error) {
      console.error('Error fetching posts:', error);
    } else {
      setPosts(data || []);
    }
  };

  // Fetch posts on mount and when date changes (could be optimized)
  useEffect(() => {
    fetchPosts();
  }, [date, view]); // simple refresh

  // Callback to refresh posts after dialog closes
  const handleDialogClose = () => {
      setIsDialogOpen(false);
      fetchPosts(); 
  };



  return (
    <div className="flex flex-col h-full bg-black/20 rounded-2xl border border-white/5 overflow-hidden">
      {/* Header Toolbar */}
      <div className="flex flex-col md:flex-row items-center justify-between p-4 border-b border-white/5 gap-4 bg-zinc-900/50 backdrop-blur-sm">
         <div className="flex items-center gap-4">
             {/* Date Display */}
             <div className="flex flex-col min-w-[200px]">
                 <h2 className="text-2xl font-bold text-white tracking-tight">
                     {getDateLabel()}
                 </h2>
                 <p className="text-xs text-zinc-500 font-medium">
                    {selectedDate ? format(selectedDate, 'MMM d, yyyy') : 'No date selected'}
                 </p>
             </div>
             
             {/* Navigation */}
             <div className="flex items-center bg-zinc-800 rounded-lg p-0.5 border border-white/10">
                 <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:bg-zinc-700 hover:text-white" onClick={handlePrev}>
                     <ChevronLeft className="h-4 w-4" />
                 </Button>
                 <span className="text-xs font-mono px-2 text-zinc-400 min-w-[140px] text-center">
                    {view === 'month' && date && `${format(startOfWeek(startOfMonth(date)), 'MMM d')} - ${format(endOfWeek(endOfMonth(date)), 'MMM d')}`}
                    {view === 'week' && date && `${format(startOfWeek(date), 'MMM d')} - ${format(endOfWeek(date), 'MMM d')}`}
                    {view === 'day' && date && format(date, 'EEEE')}
                 </span>
                 <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:bg-zinc-700 hover:text-white" onClick={handleNext}>
                     <ChevronRight className="h-4 w-4" />
                 </Button>
             </div>
         </div>

         <div className="flex items-center gap-3">
             <div className="flex items-center bg-zinc-800 rounded-lg p-1 border border-white/10">
                 <Button 
                    variant={view === 'month' ? 'secondary' : 'ghost'} 
                    size="sm" 
                    className="h-7 text-xs" 
                    onClick={() => setView('month')}
                 >
                    Month
                 </Button>
                 <Button 
                    variant={view === 'week' ? 'secondary' : 'ghost'} 
                    size="sm" 
                    className="h-7 text-xs"
                    onClick={() => setView('week')}
                 >
                    Week
                 </Button>
                 <Button 
                    variant={view === 'day' ? 'secondary' : 'ghost'} 
                    size="sm" 
                    className="h-7 text-xs"
                    onClick={() => setView('day')}
                 >
                    Day
                 </Button>
             </div>

             <Button 
                className="bg-white text-black hover:bg-zinc-200 h-9 gap-2"
                onClick={() => setIsDialogOpen(true)}
             >
                 <Plus className="h-4 w-4" />
                 Add Event
             </Button>
         </div>
      </div>
        
        {/* Main Content Area */}
      <div className="flex-1 overflow-auto bg-zinc-950 p-6">
          {view === 'month' && (
            <CalendarGrid 
                date={date} 
                selectedDate={selectedDate} 
                onSelectDate={onDateClick} 
                onDoubleClickDate={onDateDoubleClick}
                posts={posts}
            />
          )}
          {view === 'week' && (
             <WeekGrid 
                date={date} 
                selectedDate={selectedDate} 
                onSelectDate={onDateClick} 
                onDoubleClickDate={onDateDoubleClick}
                posts={posts}
             />
          )}
          {view === 'day' && (
              <DayGrid 
                  date={date}
                  posts={posts}
              />
          )}
      </div>

      {/* Dialogs */}
      {selectedDate && (
          <DayDetailsDialog 
            isOpen={isDetailsOpen}
            onClose={() => setIsDetailsOpen(false)}
            date={selectedDate}
            posts={posts.filter(p => isSameDay(new Date(p.scheduled_at), selectedDate || new Date()))}
          />
      )}

      <SchedulePostDialog 
        isOpen={isDialogOpen} 
        onClose={handleDialogClose} 
        selectedDate={selectedDate || new Date()} 
      />
    </div>
  );
}

// ... CalendarGridProps

interface CalendarGridProps {
  date: Date | undefined;
  selectedDate: Date | undefined;
  onSelectDate: (date: Date) => void;
  onDoubleClickDate: (date: Date) => void;
  posts: ScheduledPost[];
}

function CalendarGrid({ date, selectedDate, onSelectDate, onDoubleClickDate, posts }: CalendarGridProps) {
      if (!date) return null;
      // ... (existing date calcs)
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      const calendarStart = startOfWeek(monthStart);
      const calendarEnd = endOfWeek(monthEnd);
      const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
      const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

      return (
          <div className="flex flex-col h-full rounded-xl overflow-hidden border border-zinc-800 bg-black/40">
              {/* Days Header */}
               <div className="grid grid-cols-7 border-b border-zinc-800 bg-zinc-900/50">
                  {weekDays.map(d => (
                      <div key={d} className="py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                          {d}
                      </div>
                  ))}
              </div>

              {/* Days Grid */}
              <div className="flex-1 grid grid-cols-7 grid-rows-5 auto-rows-fr">
                   {calendarDays.map((dayItem, idx) => {
                       const isSelected = selectedDate ? isSameDay(dayItem, selectedDate) : false;
                       const isToday = isSameDay(dayItem, new Date());
                       
                       const dayPosts = posts.filter(p => isSameDay(new Date(p.scheduled_at), dayItem));

                       return (
                           <div 
                            key={dayItem.toString()}
                            onClick={() => onSelectDate(dayItem)}
                            onDoubleClick={() => onDoubleClickDate(dayItem)}
                            className={cn(
                                "min-h-[100px] border-r border-b border-zinc-800 p-2 relative transition-colors cursor-pointer flex flex-col gap-1 group",
                                isSelected ? "bg-violet-900/10" : "bg-zinc-950/30 hover:bg-zinc-900/50",
                                !isSameMonth(dayItem, monthStart) && !isSelected && "bg-zinc-950/10 text-zinc-600",
                                (idx + 1) % 7 === 0 && "border-r-0" // Remove right border for last col
                            )}
                           >
                               <div className="flex items-center justify-between mb-2">
                                   <span className={cn(
                                       "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full transition-colors",
                                       isToday 
                                        ? "bg-violet-600 text-white" 
                                        : isSelected 
                                            ? "bg-white text-black"
                                            : "text-zinc-400 group-hover:text-white"
                                   )}>
                                       {format(dayItem, 'd')}
                                   </span>
                               </div>
                               
                               {/* Render Posts */}
                               <div className="flex flex-col gap-1.5 overflow-hidden">
                                   {dayPosts.map(post => {
                                       const colorClass = getPostColor(post.id);
                                       return (
                                           <div key={post.id} className={cn(
                                               "flex items-center gap-2 p-1.5 rounded-md border text-[10px] shadow-sm transition-transform hover:scale-105",
                                               colorClass
                                           )}>
                                                {/* Dot/Icon */}
                                                {post.platform ? (
                                                    <div className="shrink-0 text-white/90">
                                                        {getPlatformIcon(post.platform)}
                                                    </div>
                                                ) : post.post_type === 'STORY' && (
                                                    <div className="w-1.5 h-1.5 rounded-full bg-white/80 shrink-0" />
                                                )}
                                                
                                                <span className="truncate font-bold">
                                                    {post.post_type} {post.status === 'published' ? '✓' : ''}
                                                </span>
                                           </div>
                                       );
                                   })}
                               </div>
                           </div>
                       );
                   })}
              </div>
          </div>
      )
}

function WeekGrid({ date, selectedDate, onSelectDate, onDoubleClickDate, posts }: CalendarGridProps) {
    if (!date) return null;
    const weekStart = startOfWeek(date);
    const weekEnd = endOfWeek(date);
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    return (
        <div className="flex flex-col h-full rounded-xl overflow-hidden border border-zinc-800 bg-black/40">
             <div className="grid grid-cols-7 h-full divide-x divide-zinc-800">
                 {weekDays.map((dayItem) => {
                     const isSelected = selectedDate ? isSameDay(dayItem, selectedDate) : false;
                     const isToday = isSameDay(dayItem, new Date());
                     const dayPosts = posts.filter(p => isSameDay(new Date(p.scheduled_at), dayItem));

                     return (
                         <div 
                             key={dayItem.toString()}
                             onClick={() => onSelectDate(dayItem)}
                             onDoubleClick={() => onDoubleClickDate(dayItem)}
                             className={cn(
                                 "flex flex-col h-full hover:bg-zinc-900/30 transition-colors cursor-pointer group",
                                 isSelected && "bg-violet-900/5 ring-inset ring-1 ring-violet-500/20"
                             )}
                         >
                             {/* Header */}
                             <div className={cn(
                                 "p-3 text-center border-b border-zinc-800 sticky top-0 bg-inherit z-10",
                                 isToday && "bg-zinc-900"
                             )}>
                                 <div className="text-xs font-medium text-zinc-500 uppercase mb-1">{format(dayItem, 'EEE')}</div>
                                 <div className={cn(
                                     "text-xl font-bold w-10 h-10 mx-auto flex items-center justify-center rounded-full",
                                      isToday ? "bg-violet-600 text-white" : "text-zinc-200 group-hover:bg-zinc-800"
                                 )}>
                                     {format(dayItem, 'd')}
                                 </div>
                             </div>

                             {/* Content */}
                             <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                                 {dayPosts.map(post => (
                                      <div key={post.id} className={cn(
                                        "p-2 rounded-lg border text-xs shadow-sm transition-all hover:scale-[1.02]",
                                        getPostColor(post.id)
                                    )}>
                                         <div className="flex items-center gap-2 mb-1">
                                             {post.platform && getPlatformIcon(post.platform)}
                                             <span className="font-bold opacity-90">{format(new Date(post.scheduled_at), 'h:mm a')}</span>
                                         </div>
                                         <div className="font-medium truncate">{post.post_type}</div>
                                         <div className="text-[10px] opacity-75 truncate">{post.caption || 'No caption'}</div>
                                    </div>
                                 ))}
                             </div>
                         </div>
                     );
                 })}
             </div>
        </div>
    );
}

function DayGrid({ date, posts }: { date: Date | undefined; posts: ScheduledPost[]; }) {
    if (!date) return null;
    
    // Sort posts by time
    const dayPosts = posts
        .filter(p => isSameDay(new Date(p.scheduled_at), date))
        .sort((a,b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

    return (
        <div className="h-full flex flex-col max-w-3xl mx-auto">
             <div className="mb-6 flex items-end gap-4">
                 <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col items-center justify-center text-zinc-200 shadow-sm">
                     <span className="text-xs font-semibold uppercase text-zinc-500">{format(date, 'MMM')}</span>
                     <span className="text-2xl font-bold">{format(date, 'd')}</span>
                 </div>
                 <div>
                     <h3 className="text-2xl font-bold text-white">{format(date, 'EEEE')}</h3>
                     <p className="text-zinc-500">
                         {dayPosts.length} post{dayPosts.length !== 1 ? 's' : ''} scheduled
                     </p>
                 </div>
             </div>

             <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                 {dayPosts.length === 0 ? (
                     <div className="h-64 flex flex-col items-center justify-center text-zinc-600 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20">
                         <Clock className="w-8 h-8 mb-3 opacity-50" />
                         <p>No posts scheduled for this day</p>
                     </div>
                 ) : (
                     dayPosts.map(post => (
                         <div key={post.id} className="group flex gap-4 p-4 rounded-xl border border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900/50 hover:border-zinc-700 transition-all">
                             {/* Time Column */}
                             <div className="w-20 pt-1 text-right flex-shrink-0">
                                 <span className="text-sm font-semibold text-zinc-300 block">{format(new Date(post.scheduled_at), 'h:mm a')}</span>
                             </div>

                             {/* Card */}
                             <div className="flex-1">
                                 <div className={cn("inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-medium border mb-3", getPostColor(post.id))}>
                                     {post.platform && getPlatformIcon(post.platform)}
                                     <span>{post.post_type}</span>
                                 </div>
                                 
                                 <div className="flex gap-4">
                                     {post.media_url && (
                                         <div className="w-24 h-24 rounded-lg bg-black border border-zinc-800 overflow-hidden flex-shrink-0">
                                             {post.media_url.endsWith('.mp4') || post.media_url.startsWith('data:video') ? (
                                                  <video src={post.media_url} className="w-full h-full object-cover" />
                                             ) : (
                                                  <img src={post.media_url} alt="Post media" className="w-full h-full object-cover" />
                                             )}
                                         </div>
                                     )}
                                     <div className="flex-1 min-w-0">
                                        <p className="text-sm text-zinc-300 mb-2 line-clamp-3">{post.caption || 'No caption provided.'}</p>
                                        <div className="flex items-center gap-4 text-xs text-zinc-500">
                                            <span className={cn(
                                                "capitalize px-1.5 py-0.5 rounded-full border",
                                                post.status === 'published' ? "bg-green-500/10 text-green-500 border-green-500/20" : 
                                                post.status === 'failed' ? "bg-red-500/10 text-red-500 border-red-500/20" : 
                                                "bg-blue-500/10 text-blue-500 border-blue-500/20"
                                            )}>
                                                {post.status}
                                            </span>
                                        </div>
                                     </div>
                                 </div>
                             </div>
                         </div>
                     ))
                 )}
             </div>
        </div>
    )
}
