
import React from 'react';
import { Video } from 'lucide-react';

export function VideoTab() {
  return (
    <div className="flex-1 min-h-[500px] flex overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/30">
        <div className="flex flex-col items-center justify-center h-full w-full text-zinc-500 gap-4">
            <Video className="size-16 opacity-20" />
            <p>Content for Video goes here.</p>
        </div>
    </div>
  );
}
