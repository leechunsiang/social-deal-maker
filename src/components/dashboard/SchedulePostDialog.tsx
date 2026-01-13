import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2, Upload, X, Plus, Image as ImageIcon, Clapperboard, Timer, CheckCircle2, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format, isSameDay } from 'date-fns';
import { TimePicker } from './TimePicker';
import { cn } from '@/lib/utils';
import { RepurposedContentSelector } from './RepurposedContentSelector';
import { GeneratedImageSelector } from './GeneratedImageSelector';

interface SchedulePostDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | undefined;
}

const POST_TYPES = [
    { id: 'POST', label: 'Post', icon: ImageIcon },
    { id: 'REEL', label: 'Reel', icon: Clapperboard },
    { id: 'STORY', label: 'Story', icon: Timer },
] as const;

export function SchedulePostDialog({ isOpen, onClose, selectedDate }: SchedulePostDialogProps) {
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [isImageSelectorOpen, setIsImageSelectorOpen] = useState(false);
  
  // State changes for features
  const [selectedPostTypes, setSelectedPostTypes] = useState<string[]>(['POST']);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['instagram']);
  const [postNow, setPostNow] = useState(false);
  
  const [time, setTime] = useState('12:00');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      addFiles(newFiles);
    }
  };

  const addFiles = (files: File[]) => {
      const validFiles = files.slice(0, 10 - mediaFiles.length); // Limit to 10
      if (validFiles.length === 0) return;

      setMediaFiles(prev => [...prev, ...validFiles]);
      const newPreviews = validFiles.map(file => URL.createObjectURL(file));
      setMediaPreviews(prev => [...prev, ...newPreviews]);
  };

  const removeFile = (index: number) => {
      setMediaFiles(prev => prev.filter((_, i) => i !== index));
      setMediaPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files);
      addFiles(newFiles);
    }
  };

  const clearAll = () => {
    setMediaFiles([]);
    setMediaPreviews([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const togglePostType = (typeId: string) => {
      setSelectedPostTypes(prev => {
          if (prev.includes(typeId)) {
              if (prev.length === 1) return prev; 
              return prev.filter(t => t !== typeId);
          } else {
              return [...prev, typeId];
          }
      });
  };

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms(prev => {
        if (prev.includes(platformId)) {
            if (prev.length === 1) return prev;
            return prev.filter(p => p !== platformId);
        } else {
            return [...prev, platformId];
        }
    });
  };

  const handleRepurposedSelect = async (content: string, imageUrl?: string | null) => {
      setCaption(content);
      
      if (imageUrl) {
          try {
              // Fetch the image and convert to File
              const response = await fetch(imageUrl);
              const blob = await response.blob();
              const fileName = `repurposed-image-${Date.now()}.png`;
              const file = new File([blob], fileName, { type: blob.type });
              
              addFiles([file]);
          } catch (err) {
              console.error("Failed to load repurposed image:", err);
          }
      }
  };

  const handleGeneratedImageSelect = async (imageUrl: string) => {
      try {
          // Fetch the image and convert to File
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          const fileName = `generated-image-${Date.now()}.png`;
          const file = new File([blob], fileName, { type: blob.type });
          
          addFiles([file]);
      } catch (err) {
          console.error("Failed to load generated image:", err);
      }
  };

  const handleSave = async () => {
    if (!selectedDate || (mediaFiles.length === 0 && caption.length === 0) || selectedPostTypes.length === 0 || selectedPlatforms.length === 0 || caption.length > 2200) return;

    setIsSubmitting(true);

    try {
      // 1. Check Authentication FIRST
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      const userId = user?.id;

      if (authError || !userId) {
          console.error("User not authenticated:", authError);
          alert("You are not logged in. Please log in to schedule posts.");
          setIsSubmitting(false);
          return;
      }

      // 2. Upload All Media (if any)
      let uploadedUrls: string[] = [];
      let mainMediaUrl: string | null = null;
      
      if (mediaFiles.length > 0) {
          const uploadPromises = mediaFiles.map(async (file) => {
              const fileExt = file.name.split('.').pop();
              const fileName = `${Math.random()}.${fileExt}`;
              const filePath = `${fileName}`;
              
              const { error: uploadError } = await supabase.storage
                .from('posts')
                .upload(filePath, file);
    
              if (uploadError) {
                  console.error('Upload Error:', uploadError);
                  throw new Error(`Failed to upload image: ${uploadError.message}`);
              } 
              
              const { data: urlData } = supabase.storage.from('posts').getPublicUrl(filePath);
              return urlData.publicUrl;
          });
    
          uploadedUrls = await Promise.all(uploadPromises);
          mainMediaUrl = uploadedUrls[0]; // Use first image as thumbnail
      }

      // 3. Insert into Database (Loop through selected types & platforms)

      const scheduledAt = new Date(selectedDate);
      if (postNow) {
          scheduledAt.setTime(new Date().getTime()); // Set to NOW
      } else {
          const [hours, minutes] = time.split(':').map(Number);
          scheduledAt.setHours(hours);
          scheduledAt.setMinutes(minutes);
      }

      // Create records for each Platform + Type combination
      const recordsToInsert: any[] = [];
      
      selectedPlatforms.forEach(platform => {
          selectedPostTypes.forEach(type => {
              // Logic: If > 1 file and type is POST -> CAROUSEL
              // This applies to Instagram mainly, but we store it generic.
              const isCarousel = type === 'POST' && mediaFiles.length > 1;
              const finalType = isCarousel ? 'CAROUSEL' : type;

              recordsToInsert.push({
                user_id: userId,
                media_url: mainMediaUrl, // Thumbnail
                media_urls: uploadedUrls, // Full list
                caption,
                post_type: finalType,
                scheduled_at: scheduledAt.toISOString(),
                status: postNow ? 'published' : 'scheduled', 
                created_at: new Date().toISOString(),
                platform: platform // 'instagram' or 'facebook'
              });
          });
      });

      const { data: insertedPosts, error: dbError } = await supabase
        .from('scheduled_posts')
        .insert(recordsToInsert)
        .select();

      if (dbError) throw dbError;

              // 3. If Post Now, trigger Edge Function immediately
      if (postNow && insertedPosts) {
          // Iterate over the inserted posts
          for (const post of insertedPosts) {
             const { id, platform, post_type, media_urls, media_url, caption } = post;
             
             // Only auto-publish for Instagram and Facebook
             if (platform !== 'instagram' && platform !== 'facebook') {
                 console.log(`Skipping auto-publish for ${platform} (not supported yet)`);
                 continue;
             }

             // CHECK: If URL is localhost, warn user
             const isLocalhost = media_urls?.some((url: string) => url.includes('localhost') || url.includes('127.0.0.1'));
             if (isLocalhost) {
                 alert(`Cannot publish to ${platform} using localhost URLs. Instagram/Facebook requires a public, Internet-accessible URL for images/videos.\n\nPlease use a production Supabase project or tunneling (e.g. ngrok) for local development.`);
                 console.error(`Localhost URL detected: ${media_urls}. Aborting publish request.`);
                 continue; // Skip invoking the function
             }

             const targetFunction = platform === 'facebook' ? 'publish-facebook-post' : 'publish-instagram-post';

             const payload = {
                 post_id: id, // Pass the post ID
                 media_urls: media_urls, 
                 media_url: media_url, 
                 caption: caption,
                 post_type: post_type
             };

             console.log(`Invoking ${targetFunction} for post ${id} with payload:`, payload);
             const { data, error: funcError } = await supabase.functions.invoke(targetFunction, {
                body: payload
             });

             if (funcError || data?.error) {
                 console.error(`Failed to publish to ${platform}:`, funcError || data?.error);
                 const errorMessage = funcError?.message || data?.error || 'Unknown error';
                 alert(`Failed to publish to ${platform}. Error: ${errorMessage}`);
             } else {
                 console.log(`Successfully published to ${platform}`);
                 alert(`Successfully published to ${platform}!`);
             }
          }
      }
      
      onClose();
      // Reset form
      clearAll();
      setCaption('');
      setTime('12:00');
      setSelectedPostTypes(['POST']);
      setSelectedPlatforms(['instagram']);
      setPostNow(false);

    } catch (error) {
      console.error('Error scheduling post:', error);
      alert('Failed to schedule post. Check console for details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isInstagramSelected = selectedPlatforms.includes('instagram');
  const hasMedia = mediaFiles.length > 0;
  const validationError = isInstagramSelected && !hasMedia ? "Instagram posts require an image or video." : null;

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[480px] p-0 overflow-hidden flex flex-col max-h-[90vh]">
        <DialogHeader className="px-6 py-4 border-b border-zinc-800 bg-zinc-950 sticky top-0 z-10">
          <DialogTitle className="text-xl">Schedule Post</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Create content to publish or schedule.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 scrollbar-hide">
          
          {/* Platform Selection */}
          <div className="space-y-3">
              <Label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Platform</Label>
              <div className="grid grid-cols-2 gap-3">
                  {[
                      { id: 'instagram', label: 'Instagram', color: 'from-pink-500 to-violet-500', 
                        icon: (
                          <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                          </svg>
                        ) 
                      },
                      { id: 'facebook', label: 'Facebook', color: 'from-blue-600 to-blue-400',
                        icon: (
                          <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.791-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                          </svg>
                        )
                      },
                      { id: 'x', label: 'X (Twitter)', color: 'from-zinc-400 to-zinc-600',
                        icon: (
                          <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                          </svg>
                        )
                      },
                      { id: 'linkedin', label: 'LinkedIn', color: 'from-blue-700 to-blue-500',
                        icon: (
                          <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                          </svg>
                        )
                      },
                      { id: 'tiktok', label: 'TikTok', color: 'from-pink-500 to-cyan-500',
                        icon: (
                          <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                             <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                          </svg>
                        )
                      }
                  ].map(platform => {
                      const isSelected = selectedPlatforms.includes(platform.id);
                      return (
                        <div 
                           key={platform.id}
                           onClick={() => togglePlatform(platform.id)}
                           className={cn(
                               "relative group cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 ease-in-out",
                               isSelected 
                                ? "bg-zinc-900 border-white/20 shadow-lg shadow-black/50" 
                                : "bg-black border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50"
                           )}
                        >
                             <div className="flex items-center gap-3">
                                 <div className={cn(
                                     "flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br text-white shadow-inner",
                                     platform.color
                                 )}>
                                     {platform.icon}
                                 </div>
                                 <div className="flex-1">
                                     <h3 className="font-semibold text-sm">{platform.label}</h3>
                                     <p className="text-[10px] text-zinc-500">Auto-publish enabled</p>
                                 </div>
                                 {isSelected && (
                                     <div className="bg-white/10 p-1 rounded-full">
                                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                                     </div>
                                 )}
                             </div>
                        </div>
                      )
                  })}
              </div>
          </div>

          {/* Media Upload */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Media</Label>
                <div className="flex items-center gap-2">
                    {validationError && (
                        <span className="text-[10px] text-red-500 font-medium animate-pulse">{validationError}</span>
                    )}
                    <span className="text-xs text-zinc-500 font-medium">{mediaFiles.length} / 10 selected</span>
                </div>
            </div>
            
            <div className="flex justify-end mb-2">
                 <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsImageSelectorOpen(true)}
                    className="text-xs h-7 border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 hover:text-white hover:border-zinc-700"
                   >
                       <ImageIcon className="w-3 h-3 mr-1.5 text-blue-500" />
                       Select Generated Image
                 </Button>
            </div>
            
            {mediaPreviews.length === 0 ? (
                <div 
                    className="group border-2 border-dashed border-zinc-800 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer bg-black hover:bg-zinc-900/50 hover:border-zinc-700 transition-all duration-200"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                >
                    <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Upload className="h-6 w-6 text-zinc-400 group-hover:text-white" />
                    </div>
                    <p className="text-sm text-zinc-300 font-medium mb-1">Drag & drop files here</p>
                    <p className="text-xs text-zinc-500">Supports JPG, PNG, MP4 up to 50MB</p>
                </div>
            ) : (
                <div className="grid grid-cols-4 gap-2">
                    {mediaPreviews.map((url, idx) => (
                         <div key={url} className="relative rounded-lg overflow-hidden bg-zinc-900 aspect-square group shadow-sm ring-1 ring-white/5">
                              {mediaFiles[idx]?.type.startsWith('video') ? (
                                  <video src={url} className="h-full w-full object-cover" />
                              ) : (
                                  <img src={url} alt={`Preview ${idx}`} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                              )}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <Button 
                                      size="icon" 
                                      variant="destructive" 
                                      className="h-8 w-8 rounded-full"
                                      onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                                  >
                                      <X className="h-4 w-4" />
                                  </Button>
                              </div>
                         </div>
                    ))}
                    {mediaFiles.length < 10 && (
                        <div 
                          className="aspect-square border-2 border-dashed border-zinc-800 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-900/50 hover:border-zinc-600 transition-colors bg-black"
                          onClick={() => fileInputRef.current?.click()}
                        >
                            <Plus className="h-6 w-6 text-zinc-500 mb-1" />
                            <span className="text-[10px] text-zinc-600 font-medium">Add</span>
                        </div>
                    )}
                </div>
            )}
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*,video/*" 
                multiple
                onChange={handleFileSelect} 
            />
          </div>

          {/* Post Type */}
          <div className="space-y-3">
              <Label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Post Type</Label>
              <div className="grid grid-cols-3 gap-3">
                  {POST_TYPES.map(type => {
                      const isSelected = selectedPostTypes.includes(type.id);
                      const Icon = type.icon;
                      
                      return (
                          <div 
                            key={type.id}
                            onClick={() => togglePostType(type.id)}
                            className={cn(
                                "cursor-pointer rounded-lg border-2 p-3 flex flex-col items-center justify-center gap-2 transition-all duration-200",
                                isSelected 
                                    ? "bg-zinc-900 border-violet-500/50 ring-1 ring-violet-500/20" 
                                    : "bg-black border-zinc-800 hover:bg-zinc-900 hover:border-zinc-700"
                            )}
                          >
                                <Icon className={cn("h-5 w-5", isSelected ? "text-violet-500" : "text-zinc-500")} />
                                <span className={cn("text-xs font-medium", isSelected ? "text-white" : "text-zinc-400")}>{type.label}</span>
                          </div>
                      )
                  })}
              </div>
          </div>

          {/* Caption */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
                <Label htmlFor="caption" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Caption</Label>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setIsSelectorOpen(true)}
                    className="h-6 text-[10px] text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 px-2"
                >
                    <Sparkles className="w-3 h-3 mr-1" />
                    Auto-fill from Repurposed
                </Button>
            </div>
            <div className="relative">
                <Textarea 
                    id="caption" 
                    value={caption} 
                    onChange={(e) => setCaption(e.target.value)} 
                    placeholder="Write a caption..." 
                    className={cn(
                        "bg-zinc-900/50 border-zinc-800 min-h-[120px] resize-none focus:bg-zinc-900 transition-colors p-4",
                        caption.length > 2200 && "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                    )}
                />
                <div className="absolute bottom-2 right-2 flex items-center gap-2">
                    <span className={cn(
                        "text-[10px] font-medium px-1.5 py-0.5 rounded-md",
                        caption.length > 2200 ? "text-red-400 bg-red-500/10" : "text-zinc-500 bg-zinc-800"
                    )}>
                        {caption.length} / 2200
                    </span>
                </div>
            </div>
          </div>

          {/* Date & Time & Post Now */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 space-y-4">
               <div className="flex items-center justify-between">
                   <div className="flex flex-col gap-0.5">
                       <Label htmlFor="post-now" className="cursor-pointer font-medium text-white">Post Immediately</Label>
                       <p className="text-xs text-zinc-500">Skip scheduling and publish now</p>
                   </div>
                   <Switch 
                        id="post-now" 
                        checked={postNow} 
                        onCheckedChange={setPostNow}
                   />
               </div>

               {!postNow && (
                   <div className="pt-2 border-t border-zinc-800/50 grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1 duration-200">
                       <div className="space-y-1.5">
                           <Label className="text-xs text-zinc-500">Date</Label>
                           <div className="h-10 flex items-center px-3 border border-zinc-800 rounded-md bg-zinc-950 text-zinc-400 text-sm">
                               {selectedDate ? format(selectedDate, 'MMM d, yyyy') : '-'}
                           </div>
                       </div>
                       <div className="space-y-1.5">
                           <Label htmlFor="time" className="text-xs text-zinc-500">Time</Label>
                           <TimePicker 
                                value={time} 
                                onChange={setTime}
                                minTime={
                                    selectedDate && isSameDay(selectedDate, new Date()) 
                                        ? new Date() // If today, minTime is now
                                        : undefined
                                }
                           />
                       </div>
                   </div>
               )}
          </div>

        </div>

        <DialogFooter className="px-6 py-4 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-sm sticky bottom-0 z-10 flex-col gap-2">
            {validationError && (
                <div className="w-full text-center p-2 rounded-md bg-red-500/10 border border-red-500/20 mb-1">
                    <p className="text-xs text-red-500 font-medium flex items-center justify-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        {validationError}
                    </p>
                </div>
            )}
          <div className="flex w-full justify-end gap-2">
           <Button variant="ghost" onClick={onClose} disabled={isSubmitting} className="hover:bg-zinc-900 hover:text-white">Cancel</Button>
           <Button 
            onClick={handleSave} 
            disabled={isSubmitting || (mediaFiles.length === 0 && caption.length === 0) || selectedPostTypes.length === 0 || !!validationError || caption.length > 2200}
            className="bg-white text-black hover:bg-zinc-200"
          >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {postNow ? 'Post Now' : 'Schedule Post'}
          </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <RepurposedContentSelector 
        isOpen={isSelectorOpen} 
        onClose={() => setIsSelectorOpen(false)} 
        onSelect={handleRepurposedSelect}
    />
    
    <GeneratedImageSelector
        isOpen={isImageSelectorOpen}
        onClose={() => setIsImageSelectorOpen(false)}
        onSelect={handleGeneratedImageSelect}
    />
    </>
  );
}
