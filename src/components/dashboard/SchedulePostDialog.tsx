
import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Loader2, Upload, X, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format, isSameDay } from 'date-fns';
import { TimePicker } from './TimePicker';

interface SchedulePostDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | undefined;
}

const POST_TYPES = [
    { id: 'POST', label: 'Post' },
    { id: 'REEL', label: 'Reel' },
    { id: 'STORY', label: 'Story' },
] as const;

export function SchedulePostDialog({ isOpen, onClose, selectedDate }: SchedulePostDialogProps) {
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  
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

  const handleSave = async () => {
    if (!selectedDate || mediaFiles.length === 0 || selectedPostTypes.length === 0 || selectedPlatforms.length === 0) return;

    setIsSubmitting(true);
    try {
      // 1. Upload All Media
      const uploadPromises = mediaFiles.map(async (file) => {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Math.random()}.${fileExt}`;
          const filePath = `${fileName}`;
          
          const { error: uploadError } = await supabase.storage
            .from('posts')
            .upload(filePath, file);

          if (uploadError) {
              console.error('Upload Error:', uploadError);
              // Fallback for demo if missing bucket
              return URL.createObjectURL(file);
          } else {
              const { data: urlData } = supabase.storage.from('posts').getPublicUrl(filePath);
              return urlData.publicUrl;
          }
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      const mainMediaUrl = uploadedUrls[0]; // Use first image as thumbnail

      // 2. Insert into Database (Loop through selected types & platforms)
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;

      if (!userId) {
          console.error("User not authenticated. Please log in.");
          alert("You are not logged in. Please log in to schedule posts. (Check console)");
          setIsSubmitting(false);
          return;
      }

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

      const { error: dbError } = await supabase
        .from('scheduled_posts')
        .insert(recordsToInsert);

      if (dbError) throw dbError;

      // 3. If Post Now, trigger Edge Function immediately
      if (postNow) {
          // Iterate over the records we just prepared (logic-wise)
          for (const record of recordsToInsert) {
             const { platform, post_type, media_urls, media_url, caption } = record;
             
             const targetFunction = platform === 'facebook' ? 'publish-facebook-post' : 'publish-instagram-post';

             const payload = {
                 media_urls: media_urls, 
                 media_url: media_url, 
                 caption: caption,
                 post_type: post_type
             };

             console.log(`Invoking ${targetFunction}...`);
             const { data, error: funcError } = await supabase.functions.invoke(targetFunction, {
                body: payload
             });

             if (funcError || data?.error) {
                 console.error(`Failed to publish to ${platform}:`, funcError || data?.error);
                 alert(`Failed to publish to ${platform}. Check console.`);
             } else {
                 console.log(`Successfully published to ${platform}`);
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-950 border-white/10 text-white sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Schedule Post</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Create a new post, reel, or story to schedule for later or publish immediately.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          
            {/* Media Upload */}
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                  <Label>Media (Max 10)</Label>
                  <span className="text-xs text-zinc-500">{mediaFiles.length} / 10</span>
              </div>
              
              {mediaPreviews.length === 0 ? (
                  <div 
                      className="border-2 border-dashed border-zinc-800 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-900/50 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                  >
                      <Upload className="h-8 w-8 text-zinc-500 mb-2" />
                      <p className="text-sm text-zinc-500 font-medium">Click or drag file to upload</p>
                      <p className="text-xs text-zinc-600">Images or Videos</p>
                  </div>
              ) : (
                  <div className="grid grid-cols-3 gap-2">
                      {mediaPreviews.map((url, idx) => (
                           <div key={url} className="relative rounded-lg overflow-hidden border border-zinc-800 bg-black aspect-square flex items-center justify-center group">
                                {mediaFiles[idx]?.type.startsWith('video') ? (
                                    <video src={url} className="max-h-full max-w-full object-cover" />
                                ) : (
                                    <img src={url} alt={`Preview ${idx}`} className="h-full w-full object-cover" />
                                )}
                                <Button 
                                    size="icon" 
                                    variant="destructive" 
                                    className="absolute top-1 right-1 h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                                >
                                    <X className="h-3 w-3" />
                                </Button>
                           </div>
                      ))}
                      {mediaFiles.length < 10 && (
                          <div 
                            className="aspect-square border-2 border-dashed border-zinc-800 rounded-lg flex items-center justify-center cursor-pointer hover:bg-zinc-900/50 transition-colors"
                            onClick={() => fileInputRef.current?.click()}
                          >
                              <Plus className="h-6 w-6 text-zinc-600" />
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

          {/* Platform (Multi-Select) */}
          <div className="grid gap-2">
              <Label>Platform</Label>
              <div className="flex items-center gap-4">
                  {[
                      { id: 'instagram', label: 'Instagram' },
                      { id: 'facebook', label: 'Facebook' }
                  ].map(platform => (
                      <div key={platform.id} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`platform-${platform.id}`} 
                            checked={selectedPlatforms.includes(platform.id)}
                            onCheckedChange={() => togglePlatform(platform.id)}
                            className="border-white/20 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                          />
                          <Label 
                            htmlFor={`platform-${platform.id}`} 
                            className="text-sm font-normal cursor-pointer text-zinc-300"
                          >
                            {platform.label}
                          </Label>
                      </div>
                  ))}
              </div>
          </div>

          {/* Post Type (Multi-Select) */}
          <div className="grid gap-2">
              <Label>Post Type</Label>
              <div className="flex items-center gap-4">
                  {POST_TYPES.map(type => (
                      <div key={type.id} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`type-${type.id}`} 
                            checked={selectedPostTypes.includes(type.id)}
                            onCheckedChange={() => togglePostType(type.id)}
                            className="border-white/20 data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600"
                          />
                          <Label 
                            htmlFor={`type-${type.id}`} 
                            className="text-sm font-normal cursor-pointer text-zinc-300"
                          >
                            {type.label}
                          </Label>
                      </div>
                  ))}
              </div>
          </div>

          {/* Caption */}
          <div className="grid gap-2">
            <Label htmlFor="caption">Caption</Label>
            <Textarea 
                id="caption" 
                value={caption} 
                onChange={(e) => setCaption(e.target.value)} 
                placeholder="Write a caption..." 
                className="bg-zinc-900 border-white/10 min-h-[100px]"
            />
          </div>

          {/* Date & Time & Post Now */}
          <div className="grid gap-4">
               <div className="flex items-center justify-between">
                   <Label htmlFor="post-now" className="cursor-pointer">Post Immediately</Label>
                   <Switch 
                        id="post-now" 
                        checked={postNow} 
                        onCheckedChange={setPostNow}
                   />
               </div>

               {!postNow && (
                   <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1 duration-200">
                       <div className="grid gap-2">
                           <Label>Date</Label>
                           <div className="h-10 flex items-center px-3 border border-white/10 rounded-md bg-zinc-900/50 text-zinc-500 text-sm cursor-not-allowed">
                               {selectedDate ? format(selectedDate, 'MMM d, yyyy') : '-'}
                           </div>
                       </div>
                       <div className="grid gap-2">
                           <Label htmlFor="time">Time</Label>
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

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSubmitting || mediaFiles.length === 0 || selectedPostTypes.length === 0}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {postNow ? 'Post Now' : 'Schedule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
