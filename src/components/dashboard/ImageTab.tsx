import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '../../lib/supabase';
import { Loader2, Sparkles, Download, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export function ImageTab() {
  const [prompt, setPrompt] = useState('');
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
 const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [savedGenerations, setSavedGenerations] = useState<any[]>([]);

  const [expandedPromptId, setExpandedPromptId] = useState<string | null>(null);

  const fetchSavedImages = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch generations with their images
      const { data: generations, error: genError } = await supabase
        .from('image_generations')
        .select('*, generated_images(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (genError) throw genError;

      // Get public URLs for each image
      const generationsWithUrls = await Promise.all(
        (generations || []).map(async (gen) => {
          const imagesWithUrls = await Promise.all(
            (gen.generated_images || []).map(async (img: any) => {
              const { data } = supabase.storage
                .from('generated_images')
                .getPublicUrl(img.storage_path);
              return { ...img, url: data.publicUrl };
            })
          );
          return { ...gen, generated_images: imagesWithUrls };
        })
      );

      setSavedGenerations(generationsWithUrls);
    } catch (err) {
      console.error('Error fetching saved images:', err);
    }
  };

  // Fetch saved images on mount
  useEffect(() => {
    fetchSavedImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    try {
      setIsGenerating(true);
      setError(null);
      setSuccess(null);

      const { data, error: functionError } = await supabase.functions.invoke('generate-image', {
        body: { prompt: prompt.trim() },
      });

      if (functionError) throw functionError;
      if (data?.error) throw new Error(data.error);

      if (data?.images) {
        setGeneratedImages(prev => [...prev, ...data.images]);
      }
    } catch (err) {
      console.error('Error generating images:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate images');
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleSelection = (url: string) => {
    setSelectedImages(prev => 
      prev.includes(url) 
        ? prev.filter(u => u !== url)
        : [...prev, url]
    );
  };

  const selectAll = () => {
    if (selectedImages.length === generatedImages.length) {
      setSelectedImages([]);
    } else {
      setSelectedImages([...generatedImages]);
    }
  };

  const handleSave = async () => {
    if (selectedImages.length === 0) return;

    try {
      setIsSaving(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error: functionError } = await supabase.functions.invoke('save-generated-images', {
        body: {
          prompt: prompt.trim(),
          image_urls: selectedImages,
          user_id: user.id
        },
      });

      if (functionError) throw functionError;
      if (data?.error) throw new Error(data.error);

      setSuccess(`Successfully saved ${data.saved_count} images!`);
      await fetchSavedImages(); // Refresh history
    } catch (err) {
      console.error('Error saving images:', err);
      setError(err instanceof Error ? err.message : 'Failed to save images');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 p-4 flex flex-col gap-6 max-w-6xl mx-auto w-full">
      {/* Input Section */}
      <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Sparkles className="text-violet-500" />
          Generate Images
        </h2>
        <div className="space-y-4">
          <Textarea
            placeholder="Describe the image you want to generate..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[100px] bg-zinc-950/50 border-white/10 text-white placeholder:text-zinc-600 resize-none text-lg"
            maxLength={1000}
          />
          <div className="flex justify-between items-center">
            <p className="text-xs text-zinc-500">
                Model: DALL-E 3 • Generates 1 high-quality variation
            </p>
            <div className="flex gap-2">
                {generatedImages.length > 0 && (
                    <Button
                        onClick={handleGenerate}
                        disabled={!prompt.trim() || isGenerating}
                        variant="outline"
                        className="text-zinc-400 hover:text-white border-zinc-700 hover:bg-zinc-800"
                    >
                        {isGenerating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                        Regenerate
                    </Button>
                )}
                <Button
                onClick={handleGenerate}
                disabled={!prompt.trim() || isGenerating}
                className="bg-violet-600 hover:bg-violet-500 text-white min-w-[150px]"
                >
                {isGenerating ? (
                    <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                    </>
                ) : (
                    <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate
                    </>
                )}
                </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Results Section */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-xl text-sm flex items-center gap-2">
          <CheckCircle2 className="size-4" />
          {success}
        </div>
      )}

      {generatedImages.length > 0 && (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-zinc-300">Generated Results</h3>
            <div className="flex gap-3">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAll}
                    className="text-zinc-400 hover:text-white"
                >
                    {selectedImages.length === generatedImages.length ? 'Deselect All' : 'Select All'}
                </Button>
                <Button
                    onClick={handleSave}
                    disabled={selectedImages.length === 0 || isSaving}
                    className="bg-green-600 hover:bg-green-500 text-white gap-2"
                >
                    {isSaving ? (
                        <Loader2 className="size-4 animate-spin" />
                    ) : (
                        <Download className="size-4" />
                    )}
                    Save Selected ({selectedImages.length})
                </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {generatedImages.map((url, index) => (
              <motion.div
                key={url}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  "group relative aspect-square rounded-xl overflow-hidden border-2 cursor-pointer transition-all",
                  selectedImages.includes(url)
                    ? "border-violet-500 ring-2 ring-violet-500/20"
                    : "border-white/5 hover:border-white/20"
                )}
                onClick={() => toggleSelection(url)}
              >
                <img 
                    src={url} 
                    alt={`Generated variation ${index + 1}`} 
                    className="w-full h-full object-cover"
                    loading="lazy"
                />
                
                {/* Selection Overlay */}
                <div className={cn(
                    "absolute inset-0 bg-black/40 transition-opacity flex items-center justify-center",
                    selectedImages.includes(url) ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}>
                    <div className={cn(
                        "size-8 rounded-full border-2 flex items-center justify-center transition-transform",
                        selectedImages.includes(url)
                            ? "bg-violet-600 border-violet-600 scale-110"
                            : "border-white bg-black/50 hover:scale-110"
                    )}>
                        {selectedImages.includes(url) && <CheckCircle2 className="size-5 text-white" />}
                    </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Saved Images History */}
      {savedGenerations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <h3 className="text-lg font-semibold text-zinc-300">Saved Images</h3>
          
          {savedGenerations.map((generation) => (
            <div
              key={generation.id}
              className="bg-zinc-900/50 border border-white/5 rounded-xl overflow-hidden backdrop-blur-sm"
            >
              <button
                onClick={() => setExpandedPromptId(expandedPromptId === generation.id ? null : generation.id)}
                className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{generation.prompt}</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {generation.generated_images?.length || 0} images • {new Date(generation.created_at).toLocaleDateString()}
                  </p>
                </div>
                {expandedPromptId === generation.id ? (
                  <ChevronDown className="size-5 text-zinc-400 flex-shrink-0" />
                ) : (
                  <ChevronRight className="size-5 text-zinc-400 flex-shrink-0" />
                )}
              </button>

              {expandedPromptId === generation.id && generation.generated_images?.length > 0 && (
                <div className="p-4 pt-0 grid grid-cols-2 md:grid-cols-4 gap-4">
                  {generation.generated_images.map((img: any) => (
                    <div key={img.id} className="aspect-square rounded-lg overflow-hidden border border-white/10">
                      <img
                        src={img.url}
                        alt="Saved generation"
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
