import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ImageIcon, Loader2 } from 'lucide-react';

interface GeneratedImage {
  id: string;
  storage_path: string;
  url?: string;
}

interface GenerationGroup {
  id: string;
  prompt: string;
  created_at: string;
  generated_images: GeneratedImage[];
}

interface GeneratedImageSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (imageUrl: string) => void;
}

export function GeneratedImageSelector({ isOpen, onClose, onSelect }: GeneratedImageSelectorProps) {
  const [generations, setGenerations] = useState<GenerationGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchImages();
    }
  }, [isOpen]);

  const fetchImages = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: generationsData, error: genError } = await supabase
        .from('image_generations')
        .select('*, generated_images(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (genError) throw genError;

      // Get public URLs
      const generationsWithUrls = await Promise.all(
        (generationsData || []).map(async (gen) => {
          const imagesWithUrls = await Promise.all(
            (gen.generated_images || []).map(async (img: GeneratedImage) => {
              const { data } = supabase.storage
                .from('generated_images')
                .getPublicUrl(img.storage_path);
              return { ...img, url: data.publicUrl };
            })
          );
          return { ...gen, generated_images: imagesWithUrls };
        })
      );

      setGenerations(generationsWithUrls);
    } catch (err) {
      console.error('Error fetching generated images:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[700px] max-h-[80vh] flex flex-col">
        <DialogHeader className="border-b border-zinc-800 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-blue-500" />
            Select Generated Image
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-6">
          {isLoading ? (
             <div className="flex items-center justify-center py-12 text-zinc-500 gap-2">
                 <Loader2 className="w-4 h-4 animate-spin" /> Loading images...
             </div>
          ) : generations.length === 0 ? (
             <div className="text-center py-12 text-zinc-500">No generated images found.</div>
          ) : (
             <div className="grid grid-cols-3 gap-4 p-1">
                {generations.flatMap(group => 
                    group.generated_images.map(img => (
                        <div 
                            key={img.id}
                            className="group relative aspect-square rounded-xl overflow-hidden border border-zinc-800 cursor-pointer hover:border-blue-500 transition-colors bg-zinc-900"
                            onClick={() => {
                                if (img.url) {
                                    onSelect(img.url);
                                    onClose();
                                }
                            }}
                        >
                            <img src={img.url} className="w-full h-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2 text-center">
                                <span className="text-[10px] text-white font-medium line-clamp-2">{group.prompt}</span>
                            </div>
                        </div>
                    ))
                )}
             </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
