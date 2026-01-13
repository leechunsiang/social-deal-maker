import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, FileText, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';

interface RepurposedItem {
  id: string;
  original_content: string;
  repurposed_content: string;
  output_format: string;
  created_at: string;
  source_type: string;
  source_image_path?: string;
}

interface RepurposedContentSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (content: string, imageUrl?: string | null) => void;
}

export function RepurposedContentSelector({ isOpen, onClose, onSelect }: RepurposedContentSelectorProps) {
  const [history, setHistory] = useState<RepurposedItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

  const fetchHistory = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('repurposed_content')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = async (item: RepurposedItem) => {
    let imageUrl: string | null = null;
    
    if (item.source_image_path) {
       const { data } = supabase.storage
        .from('generated_images')
        .getPublicUrl(item.source_image_path);
       imageUrl = data.publicUrl;
    }
    
    onSelect(item.repurposed_content, imageUrl);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader className="border-b border-zinc-800 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-500" />
            Select from Repurposed Content
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {isLoading ? (
             <div className="text-center py-8 text-zinc-500">Loading history...</div>
          ) : history.length === 0 ? (
             <div className="text-center py-8 text-zinc-500">No repurpose history found.</div>
          ) : (
             history.map(item => (
               <div 
                 key={item.id} 
                 className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900/80 hover:border-zinc-700 cursor-pointer transition-all group"
                 onClick={() => handleSelect(item)}
               >
                 <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 capitalize">
                            {item.output_format.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] text-zinc-500">{format(new Date(item.created_at), 'MMM d, h:mm a')}</span>
                    </div>
                    {item.source_type === 'generated_image' && <ImageIcon className="w-3 h-3 text-zinc-500" />}
                    {item.source_type === 'text' && <FileText className="w-3 h-3 text-zinc-500" />}
                 </div>
                 
                 <div className="space-y-2">
                    <p className="text-sm text-zinc-300 line-clamp-3 group-hover:text-white transition-colors">
                        {item.repurposed_content}
                    </p>
                    {item.source_type === 'generated_image' && (
                        <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            Includes generated image
                        </div>
                    )}
                 </div>
               </div>
             ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
