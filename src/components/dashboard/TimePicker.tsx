
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Clock } from 'lucide-react';

interface TimePickerProps {
    value: string; // "HH:mm" 24h format
    onChange: (time: string) => void;
    minTime?: Date; // If provided, disable times before this
}

export function TimePicker({ value, onChange, minTime }: TimePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    
    // Parse initial value (HH:mm) to 12h format
    const [hours24, minutes] = value.split(':').map(Number);
    const initialAmpm = hours24 >= 12 ? 'PM' : 'AM';
    const initialHour12 = hours24 % 12 || 12;

    const [selectedHour, setSelectedHour] = useState(initialHour12);
    const [selectedMinute, setSelectedMinute] = useState(minutes);
    const [selectedAmpm, setSelectedAmpm] = useState<'AM' | 'PM'>(initialAmpm);

    // Sync state if value prop changes externally
    useEffect(() => {
        const [h, m] = value.split(':').map(Number);
        const newAmpm = h >= 12 ? 'PM' : 'AM';
        const newHour = h % 12 || 12;
        
        // Only update state if it differs to avoid loops (though split map creates new ref, simple comparison helps)
        // Actually, just setting it is fine as long as we don't trigger onChange
        setSelectedAmpm(newAmpm);
        setSelectedHour(newHour);
        setSelectedMinute(m);
    }, [value]);

    const handleTimeChange = (h: number, m: number, ampm: 'AM' | 'PM') => {
        setSelectedHour(h);
        setSelectedMinute(m);
        setSelectedAmpm(ampm);

        // Convert back to 24h for parent
        let h24 = h;
        if (ampm === 'PM' && h !== 12) h24 += 12;
        if (ampm === 'AM' && h === 12) h24 = 0;
        
        const timeString = `${h24.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        onChange(timeString);
    };

    // Generate options
    const hours = Array.from({ length: 12 }, (_, i) => i + 1);
    const minuteOptions = Array.from({ length: 12 }, (_, i) => i * 5); // 0, 5, 10...

    // Validation Check
    const isTimeDisabled = (h: number, m: number, ampm: 'AM' | 'PM') => {
        if (!minTime) return false;

        let h24 = h;
        if (ampm === 'PM' && h !== 12) h24 += 12;
        if (ampm === 'AM' && h === 12) h24 = 0;

        const checkDate = new Date(minTime);
        checkDate.setHours(h24, m, 0, 0);

        return checkDate < minTime;
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button 
                    variant="outline" 
                    className={cn(
                        "w-full justify-start text-left font-normal bg-zinc-900 border-white/10 hover:bg-zinc-800 text-white",
                        !value && "text-muted-foreground"
                    )}
                >
                    <Clock className="mr-2 h-4 w-4" />
                    {selectedHour.toString().padStart(2, '0')}:{selectedMinute.toString().padStart(2, '0')} {selectedAmpm}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-zinc-950 border-zinc-800" align="start">
                <div className="flex h-[300px]">
                    {/* Hours */}
                    <div className="flex flex-col border-r border-zinc-800 overflow-y-auto scrollbar-hide w-[70px]">
                        <div className="px-2 py-2 text-xs font-medium text-zinc-500 text-center sticky top-0 bg-zinc-950">Hr</div>
                        {hours.map(h => {
                            const disabled = isTimeDisabled(h, 0, selectedAmpm) && isTimeDisabled(h, 55, selectedAmpm);
                            
                            return (
                                <button
                                    key={h}
                                    onClick={() => handleTimeChange(h, selectedMinute, selectedAmpm)}
                                    disabled={disabled}
                                    className={cn(
                                        "py-2 px-4 text-sm hover:bg-zinc-900 transition-colors disabled:opacity-30 disabled:hover:bg-transparent text-zinc-300",
                                        selectedHour === h && "bg-violet-600 text-white hover:bg-violet-700 font-bold"
                                    )}
                                >
                                    {h.toString().padStart(2, '0')}
                                </button>
                            );
                        })}
                    </div>

                     {/* Minutes */}
                     <div className="flex flex-col border-r border-zinc-800 overflow-y-auto scrollbar-hide w-[70px]">
                        <div className="px-2 py-2 text-xs font-medium text-zinc-500 text-center sticky top-0 bg-zinc-950">Min</div>
                        {minuteOptions.map(m => {
                            const disabled = isTimeDisabled(selectedHour, m, selectedAmpm);
                            return (
                                <button
                                    key={m}
                                    disabled={disabled}
                                    onClick={() => handleTimeChange(selectedHour, m, selectedAmpm)}
                                    className={cn(
                                        "py-2 px-4 text-sm hover:bg-zinc-900 transition-colors disabled:opacity-30 disabled:hover:bg-transparent text-zinc-300",
                                        selectedMinute === m && "bg-violet-600 text-white hover:bg-violet-700 font-bold"
                                    )}
                                >
                                    {m.toString().padStart(2, '0')}
                                </button>
                            );
                        })}
                    </div>

                    {/* AM/PM */}
                    <div className="flex flex-col w-[70px]">
                         <div className="px-2 py-2 text-xs font-medium text-zinc-500 text-center sticky top-0 bg-zinc-950">Mid</div>
                         {['AM', 'PM'].map((ampm) => {
                             const disabled = ampm === 'AM' && isTimeDisabled(11, 55, 'AM'); // Rough check on AM passed
                             
                             return (
                                <button
                                    key={ampm}
                                    disabled={disabled}
                                    onClick={() => handleTimeChange(selectedHour, selectedMinute, ampm as 'AM'|'PM')}
                                    className={cn(
                                        "py-2 px-4 text-sm hover:bg-zinc-900 transition-colors disabled:opacity-30 text-zinc-300",
                                        selectedAmpm === ampm && "bg-violet-600 text-white hover:bg-violet-700 font-bold"
                                    )}
                                >
                                    {ampm}
                                </button>
                             )
                         })}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
