
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Grid, List, Plus } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek } from 'date-fns';
import { cn } from '@/lib/utils';

export default function ScheduleTab() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');

  // Month Navigation
  const handlePrevMonth = () => {
    if (date) setDate(subMonths(date, 1));
  };

  const handleNextMonth = () => {
    if (date) setDate(addMonths(date, 1));
  };


  return (
    <div className="flex flex-col h-full bg-black/20 rounded-2xl border border-white/5 overflow-hidden">
      {/* Header Toolbar */}
      <div className="flex flex-col md:flex-row items-center justify-between p-4 border-b border-white/5 gap-4 bg-zinc-900/50 backdrop-blur-sm">
         <div className="flex items-center gap-4">
             {/* Date Display */}
             <div className="flex flex-col">
                 <h2 className="text-2xl font-bold text-white tracking-tight">
                     {date ? format(date, 'MMMM yyyy') : 'Select Date'}
                 </h2>
                 <p className="text-xs text-zinc-500 font-medium">
                    {selectedDate ? format(selectedDate, 'MMM d, yyyy') : 'No date selected'}
                 </p>
             </div>
             
             {/* Navigation */}
             <div className="flex items-center bg-zinc-800 rounded-lg p-0.5 border border-white/10">
                 <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:bg-zinc-700 hover:text-white" onClick={handlePrevMonth}>
                     <ChevronLeft className="h-4 w-4" />
                 </Button>
                 <span className="text-xs font-mono px-2 text-zinc-400 min-w-[140px] text-center">
                    {date && format(startOfWeek(date), 'MMM d')} - {date && format(endOfWeek(date), 'MMM d, yyyy')}
                 </span>
                 <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:bg-zinc-700 hover:text-white" onClick={handleNextMonth}>
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

             <Button className="bg-white text-black hover:bg-zinc-200 h-9 gap-2">
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
                onSelectDate={(d) => {
                    setSelectedDate(d);
                    // Optional: Switch view month if selecting a day from prev/next month
                    if (date && !isSameMonth(d, date)) {
                        setDate(d);
                    }
                }} 
            />
          )}
          {view === 'week' && (
              <div className="h-full flex items-center justify-center text-zinc-500 flex-col gap-2">
                  <Grid className="h-10 w-10 opacity-20" />
                  <p>Week view implementation pending.</p>
              </div>
          )}
          {view === 'day' && (
               <div className="h-full flex items-center justify-center text-zinc-500 flex-col gap-2">
                  <List className="h-10 w-10 opacity-20" />
                  <p>Day view implementation pending.</p>
              </div>
          )}
      </div>
    </div>
  );
}

// Improved Grid Render using eachDayOfInterval
interface CalendarGridProps {
    date: Date | undefined;
    selectedDate: Date | undefined;
    onSelectDate: (date: Date) => void;
}

function CalendarGrid({ date, selectedDate, onSelectDate }: CalendarGridProps) {
      if (!date) return null;
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      const calendarStart = startOfWeek(monthStart);
      const calendarEnd = endOfWeek(monthEnd);

      const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

      const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

      return (
          <div className="flex flex-col h-full">
              {/* Days Header */}
              <div className="grid grid-cols-7 border-b border-zinc-800">
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
                       
                       return (
                           <div 
                            key={dayItem.toString()}
                            onClick={() => onSelectDate(dayItem)}
                            className={cn(
                                "min-h-[100px] border-r border-b border-zinc-800 p-2 relative transition-colors cursor-pointer flex flex-col gap-1 group",
                                isSelected ? "bg-violet-900/20 hover:bg-violet-900/30" : "bg-zinc-950/30 hover:bg-zinc-900/50",
                                !isSameMonth(dayItem, monthStart) && !isSelected && "bg-zinc-950/10 text-zinc-600",
                                (idx + 1) % 7 === 0 && "border-r-0" // Remove right border for last col
                            )}
                           >
                               <div className="flex items-center justify-between">
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
                           </div>
                       );
                   })}
              </div>
          </div>
      )
  }
