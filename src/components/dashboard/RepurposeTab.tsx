import { useState, useEffect } from 'react';
import { Upload, FileText, Image as ImageIcon, Loader2, Copy, CheckCircle2, Sparkles, ChevronDown, ChevronRight, Trash2, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '../../lib/supabase';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

type InputSource = 'upload' | 'paste' | 'generated';
type OutputFormat = 
  | 'social_post' 
  | 'instagram_caption' 
  | 'quiz' 
  | 'infographic' 
  | 'blog_post' 
  | 'video_script' 
  | 'key_takeaways';

interface GeneratedImage {
  id: string;
  storage_path: string;
  url: string;
}

interface ImageGeneration {
  id: string;
  prompt: string;
  created_at: string;
  generated_images: GeneratedImage[];
}

interface RepurposedItem {
  id: string;
  original_content: string;
  output_format: string;
  repurposed_content: string;
  source_type: string;
  created_at: string;
}

const FORMAT_OPTIONS = [
  { 
    id: 'social_post', 
    label: 'Social Media Post', 
    description: '280 characters max with hashtags',
    icon: '📱'
  },
  { 
    id: 'instagram_caption', 
    label: 'Instagram Caption', 
    description: 'Engaging caption with emojis & hashtags',
    icon: '📷'
  },
  { 
    id: 'quiz', 
    label: 'Quiz', 
    description: '5-10 multiple choice questions',
    icon: '❓'
  },
  { 
    id: 'infographic', 
    label: 'Infographic Script', 
    description: '5-7 key stats and facts',
    icon: '📊'
  },
  { 
    id: 'blog_post', 
    label: 'Blog Post', 
    description: '500-800 words with SEO',
    icon: '📝'
  },
  { 
    id: 'video_script', 
    label: 'Video Script', 
    description: '60-90 second script',
    icon: '🎬'
  },
  { 
    id: 'key_takeaways', 
    label: 'Key Takeaways', 
    description: '5-7 actionable bullet points',
    icon: '✨'
  },
];

export function RepurposeTab() {
  const [inputSource, setInputSource] = useState<InputSource>('paste');
  const [textContent, setTextContent] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<OutputFormat>('social_post');
  const [generatedImages, setGeneratedImages] = useState<ImageGeneration[]>([]);
  const [selectedImagePath, setSelectedImagePath] = useState<string | null>(null);
  const [expandedPromptId, setExpandedPromptId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [repurposedContent, setRepurposedContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [history, setHistory] = useState<RepurposedItem[]>([]);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  // Fetch generated images and history on mount
  useEffect(() => {
    fetchHistory();
    if (inputSource === 'generated') {
      fetchGeneratedImages();
    }
  }, [inputSource]);

  const fetchGeneratedImages = async () => {
    try {
      setIsLoadingImages(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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

      setGeneratedImages(generationsWithUrls);
    } catch (err) {
      console.error('Error fetching generated images:', err);
      setError('Failed to load generated images');
    } finally {
      setIsLoadingImages(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error: historyError } = await supabase
        .from('repurposed_content')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (historyError) throw historyError;

      setHistory(data || []);
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };

  const handleDeleteHistoryItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item from history?')) return;

    try {
      const { error } = await supabase
        .from('repurposed_content')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setHistory(history.filter(item => item.id !== id));
    } catch (err) {
      console.error('Error deleting history item:', err);
      setError('Failed to delete history item');
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      
      // Read text files directly
      if (file.type.startsWith('text/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setTextContent(e.target?.result as string);
        };
        reader.readAsText(file);
      }
    }
  };

  const handleRepurpose = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setRepurposedContent('');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const requestBody: {
        outputFormat: OutputFormat;
        content?: string;
        generatedImagePath?: string;
        uploadedFilePath?: string;
        fileType?: 'text' | 'image' | 'docx' | 'pdf';
      } = {
        outputFormat: selectedFormat,
      };

      if (inputSource === 'paste') {
        if (!textContent.trim()) {
          throw new Error('Please enter some content to repurpose');
        }
        requestBody.content = textContent.trim();
      } else if (inputSource === 'generated') {
        if (!selectedImagePath) {
          throw new Error('Please select an image');
        }
        requestBody.generatedImagePath = selectedImagePath;
      } else if (inputSource === 'upload') {
        if (!uploadedFile) {
          throw new Error('Please upload a file');
        }
        
        // Upload file to Supabase Storage
        const fileExt = uploadedFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('repurpose_uploads')
          .upload(filePath, uploadedFile);

        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

        requestBody.uploadedFilePath = filePath;
        
        // Determine file type
        if (uploadedFile.type.startsWith('image/')) {
          requestBody.fileType = 'image';
        } else if (uploadedFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || uploadedFile.name.endsWith('.docx')) {
           requestBody.fileType = 'docx';
        } else if (uploadedFile.type === 'application/pdf' || uploadedFile.name.endsWith('.pdf')) {
          requestBody.fileType = 'pdf';
        } else if (uploadedFile.type.startsWith('text/') || uploadedFile.name.endsWith('.md')) {
          requestBody.fileType = 'text';
        } else {
          // Default to text if we can read it
           requestBody.fileType = 'text';
        }
      }

      const { data, error: functionError } = await supabase.functions.invoke('repurpose-content', {
        body: requestBody,
      });

      if (functionError) throw functionError;
      if (data?.error) throw new Error(data.error);

      setRepurposedContent(data.repurposedContent || '');
      // Refresh history after successful repurpose
      await fetchHistory();
    } catch (err) {
      console.error('Error repurposing content:', err);
      setError(err instanceof Error ? err.message : 'Failed to repurpose content');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(repurposedContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const canRepurpose = () => {
    if (inputSource === 'paste') return textContent.trim().length > 0;
    if (inputSource === 'generated') return selectedImagePath !== null;
    if (inputSource === 'upload') return uploadedFile !== null;
    return false;
  };

  return (
    <div className="flex-1 p-4 flex flex-col gap-6 max-w-6xl mx-auto w-full">
      {/* Input Source Tabs */}
      <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Sparkles className="text-violet-500" />
          Content Repurposing
        </h2>

        {/* Source Selector */}
        <div className="flex gap-2 mb-6 p-1 bg-zinc-950/50 rounded-lg">
          <button
            onClick={() => setInputSource('paste')}
            className={cn(
              "flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2",
              inputSource === 'paste'
                ? "bg-violet-600 text-white"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            )}
          >
            <FileText size={16} />
            Paste Text
          </button>
          <button
            onClick={() => setInputSource('upload')}
            className={cn(
              "flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2",
              inputSource === 'upload'
                ? "bg-violet-600 text-white"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            )}
          >
            <Upload size={16} />
            Upload File
          </button>
          <button
            onClick={() => setInputSource('generated')}
            className={cn(
              "flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2",
              inputSource === 'generated'
                ? "bg-violet-600 text-white"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            )}
          >
            <ImageIcon size={16} />
            Generated Images
          </button>
        </div>

        {/* Input Area - Paste Text */}
        {inputSource === 'paste' && (
          <div className="space-y-4">
            <Textarea
              placeholder="Paste your content here (article, blog post, notes, etc.)..."
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              className="min-h-[200px] bg-zinc-950/50 border-white/10 text-white placeholder:text-zinc-600 resize-none"
              maxLength={10000}
            />
            <p className="text-xs text-zinc-500">
              {textContent.length} / 10,000 characters
            </p>
          </div>
        )}

        {/* Input Area - Upload File */}
        {inputSource === 'upload' && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-violet-500/50 transition-colors">
              <input
                type="file"
                accept=".txt,.md,.doc,.docx,.pdf,image/*"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="size-12 mx-auto text-zinc-600 mb-4" />
                <p className="text-white font-medium mb-2">
                  {uploadedFile ? uploadedFile.name : 'Click to upload or drag and drop'}
                </p>
                <p className="text-xs text-zinc-500">
                  Text, PDF, Word documents, or images
                </p>
              </label>
            </div>
          </div>
        )}

        {/* Input Area - Generated Images */}
        {inputSource === 'generated' && (
          <div className="space-y-4">
            {isLoadingImages ? (
              <div className="flex justify-center py-12">
                <Loader2 className="size-8 animate-spin text-violet-500" />
              </div>
            ) : generatedImages.length === 0 ? (
              <div className="text-center py-12 text-zinc-500">
                <ImageIcon className="size-12 mx-auto mb-4 opacity-50" />
                <p>No generated images found.</p>
                <p className="text-sm mt-2">Generate images in the Image tab first.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {generatedImages.map((generation) => (
                  <div
                    key={generation.id}
                    className="bg-zinc-950/50 border border-white/5 rounded-xl overflow-hidden"
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
                        <ChevronDown className="size-5 text-zinc-400 shrink-0" />
                      ) : (
                        <ChevronRight className="size-5 text-zinc-400 shrink-0" />
                      )}
                    </button>

                    {expandedPromptId === generation.id && generation.generated_images?.length > 0 && (
                      <div className="p-4 pt-0 grid grid-cols-2 md:grid-cols-4 gap-4">
                        {generation.generated_images.map((img) => (
                          <div
                            key={img.id}
                            onClick={() => setSelectedImagePath(img.storage_path)}
                            className={cn(
                              "aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all",
                              selectedImagePath === img.storage_path
                                ? "border-violet-500 ring-2 ring-violet-500/20"
                                : "border-white/10 hover:border-white/30"
                            )}
                          >
                            <img
                              src={img.url}
                              alt="Generated image"
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Format Selection */}
      <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
        <h3 className="text-lg font-semibold mb-4">Select Output Format</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {FORMAT_OPTIONS.map((format) => (
            <button
              key={format.id}
              onClick={() => setSelectedFormat(format.id as OutputFormat)}
              className={cn(
                "p-4 rounded-xl text-left transition-all border-2",
                selectedFormat === format.id
                  ? "bg-violet-600/20 border-violet-500 text-white"
                  : "bg-zinc-950/50 border-white/5 text-zinc-400 hover:border-white/20 hover:text-white"
              )}
            >
              <div className="text-2xl mb-2">{format.icon}</div>
              <div className="font-medium mb-1">{format.label}</div>
              <div className="text-xs opacity-80">{format.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Generate Button */}
      <Button
        onClick={handleRepurpose}
        disabled={!canRepurpose() || isLoading}
        className="bg-violet-600 hover:bg-violet-500 text-white h-12 text-lg font-semibold"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Repurposing...
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-5 w-5" />
            Repurpose Content
          </>
        )}
      </Button>

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Results Display */}
      {repurposedContent && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <CheckCircle2 className="text-green-500" />
              Repurposed Content
            </h3>
            <Button
              onClick={handleCopy}
              variant="outline"
              size="sm"
              className="text-zinc-400 hover:text-white"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy
                </>
              )}
            </Button>
          </div>
          <div className="bg-zinc-950/50 rounded-lg p-6 border border-white/5">
            <pre className="whitespace-pre-wrap text-zinc-200 font-sans text-sm leading-relaxed">
              {repurposedContent}
            </pre>
          </div>
        </motion.div>
      )}

      {/* History Section */}
      {history.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm"
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <History className="text-violet-500" />
            Repurpose History
          </h3>
          
          <div className="space-y-3">
            {history.map((item) => {
              const formatLabel = FORMAT_OPTIONS.find(f => f.id === item.output_format)?.label || item.output_format;
              const formatIcon = FORMAT_OPTIONS.find(f => f.id === item.output_format)?.icon || '📄';
              
              return (
                <div
                  key={item.id}
                  className="bg-zinc-950/50 border border-white/5 rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedHistoryId(expandedHistoryId === item.id ? null : item.id)}
                    className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors text-left"
                  >
                    <div className="flex-1 min-w-0 flex items-center gap-3">
                      <div className="text-2xl">{formatIcon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium">{formatLabel}</p>
                        <p className="text-xs text-zinc-500 mt-1 truncate">
                          {item.original_content.substring(0, 80)}...
                        </p>
                        <p className="text-xs text-zinc-600 mt-1">
                          {new Date(item.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteHistoryItem(item.id);
                        }}
                        className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-zinc-500 hover:text-red-400"
                      >
                        <Trash2 size={16} />
                      </button>
                      {expandedHistoryId === item.id ? (
                        <ChevronDown className="size-5 text-zinc-400 shrink-0" />
                      ) : (
                        <ChevronRight className="size-5 text-zinc-400 shrink-0" />
                      )}
                    </div>
                  </button>

                  {expandedHistoryId === item.id && (
                    <div className="p-4 pt-0 space-y-4 border-t border-white/5">
                      {/* Original Content */}
                      <div>
                        <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wide">Original Content</p>
                        <div className="bg-zinc-900/50 rounded-lg p-3 border border-white/5">
                          <p className="text-sm text-zinc-300 whitespace-pre-wrap">
                            {item.original_content}
                          </p>
                        </div>
                      </div>
                      
                      {/* Repurposed Content */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs text-zinc-500 uppercase tracking-wide">Repurposed Content</p>
                          <Button
                            onClick={() => {
                              navigator.clipboard.writeText(item.repurposed_content);
                              setCopied(true);
                              setTimeout(() => setCopied(false), 2000);
                            }}
                            variant="outline"
                            size="sm"
                            className="text-zinc-400 hover:text-white h-7 text-xs"
                          >
                            <Copy className="mr-1 h-3 w-3" />
                            Copy
                          </Button>
                        </div>
                        <div className="bg-zinc-900/50 rounded-lg p-3 border border-white/5">
                          <pre className="text-sm text-zinc-200 whitespace-pre-wrap font-sans">
                            {item.repurposed_content}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
