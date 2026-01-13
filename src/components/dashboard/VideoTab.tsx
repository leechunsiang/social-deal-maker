
import React, { useState, useEffect } from 'react';
import { Upload, FileVideo, Play, FileText, Loader2, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

interface VideoItem {
  id: string;
  title: string;
  storage_path: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  transcription: string | null;
  created_at: string;
}

export function VideoTab() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [transcribingId, setTranscribingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching videos:', error);
    } else {
      setVideos(data || []);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setError(null);
      const file = event.target.files?.[0];
      if (!file) return;

      if (file.size > 50 * 1024 * 1024) { // 50MB limit
          setError("File too large. Max 50MB.");
          return;
      }

      setUploading(true);
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // 1. Upload to Storage
      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Create DB Record
      const { error: dbError } = await supabase
        .from('videos')
        .insert({
          user_id: user.id,
          title: file.name,
          storage_path: filePath,
          status: 'pending'
        });

      if (dbError) throw dbError;

      await fetchVideos();
    } catch (err: any) {
      console.error('Upload failed:', err);
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      // Reset input
      event.target.value = '';
    }
  };

  const handleTranscribe = async (video: VideoItem) => {
    try {
      setTranscribingId(video.id);
      
      const { data, error } = await supabase.functions.invoke('transcribe-video', {
        body: { video_id: video.id }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      await fetchVideos();
    } catch (err: any) {
      console.error('Transcription failed:', err);
      setError(`Transcription failed: ${err.message}`);
    } finally {
      setTranscribingId(null);
    }
  };

  const handleDelete = async (video: VideoItem) => {
      if (!confirm('Are you sure you want to delete this video?')) return;
      
      try {
          // Delete from storage
          await supabase.storage.from('videos').remove([video.storage_path]);
          
          // Delete from DB
          await supabase.from('videos').delete().eq('id', video.id);
          
          setVideos(videos.filter(v => v.id !== video.id));
      } catch (err) {
          console.error('Delete failed:', err);
      }
  };

  return (
    <div className="flex flex-col gap-6 h-full max-h-[calc(100vh-120px)] overflow-y-auto">
      {/* Upload Section */}
      <div className="p-8 rounded-2xl border border-dashed border-white/20 bg-zinc-900/30 flex flex-col items-center justify-center gap-4 hover:bg-zinc-900/50 transition-colors">
        <input
            type="file"
            accept="video/*"
            onChange={handleFileUpload}
            className="hidden"
            id="video-upload"
            disabled={uploading}
        />
        <label 
            htmlFor="video-upload"
            className={cn(
                "flex flex-col items-center cursor-pointer",
                uploading && "opacity-50 cursor-not-allowed"
            )}
        >
            <div className="size-16 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-400 mb-4">
                {uploading ? <Loader2 className="animate-spin size-8" /> : <Upload className="size-8" />}
            </div>
            <h3 className="text-xl font-semibold">Upload Video</h3>
            <p className="text-zinc-400 mt-2 text-center max-w-sm">
                Drag and drop or click to upload. MP4, MOV, or WEBM. Max 50MB.
            </p>
        </label>
        {error && (
            <div className="flex items-center gap-2 text-red-400 bg-red-400/10 px-4 py-2 rounded-lg text-sm">
                <AlertCircle size={16} />
                {error}
            </div>
        )}
      </div>

      {/* Video List */}
      <div className="grid grid-cols-1 gap-4">
          <h2 className="text-lg font-semibold sticky top-0 bg-zinc-950 py-2 z-10">Your Videos</h2>
          {videos.length === 0 ? (
              <div className="text-center py-10 text-zinc-500">
                  No videos uploaded yet.
              </div>
          ) : (
              videos.map((video) => (
                  <div key={video.id} className="bg-zinc-900/50 border border-white/5 rounded-xl p-4 flex flex-col md:flex-row gap-4">
                      {/* Video Preview / Icon */}
                      <div className="flex-shrink-0 size-24 bg-black rounded-lg flex items-center justify-center text-zinc-600">
                          <FileVideo size={32} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 flex flex-col gap-2">
                          <div className="flex items-start justify-between">
                              <div>
                                  <h3 className="font-medium truncate pr-4" title={video.title}>{video.title}</h3>
                                  <p className="text-xs text-zinc-500">{new Date(video.created_at).toLocaleString()}</p>
                              </div>
                              <button 
                                onClick={() => handleDelete(video)}
                                className="text-zinc-500 hover:text-red-400"
                              >
                                  <Trash2 size={16} />
                              </button>
                          </div>

                          <div className="flex items-center gap-2 mt-auto">
                              {/* Status Badge */}
                              <div className={cn(
                                  "px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1.5",
                                  video.status === 'completed' ? "bg-green-500/10 text-green-400" :
                                  video.status === 'processing' ? "bg-amber-500/10 text-amber-400" :
                                  video.status === 'failed' ? "bg-red-500/10 text-red-400" :
                                  "bg-zinc-800 text-zinc-400"
                              )}>
                                  {video.status === 'completed' && <CheckCircle size={12} />}
                                  {video.status === 'processing' && <Loader2 size={12} className="animate-spin" />}
                                  {video.status === 'failed' && <AlertCircle size={12} />}
                                  {video.status.toUpperCase()}
                              </div>

                              {/* Actions */}
                              {video.status === 'pending' && (
                                  <button
                                      onClick={() => handleTranscribe(video)}
                                      disabled={transcribingId === video.id}
                                      className="ml-auto px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium transition-colors flex items-center gap-2"
                                  >
                                      {transcribingId === video.id ? (
                                          <><Loader2 size={14} className="animate-spin" /> Processing</>
                                      ) : (
                                          <><FileText size={14} /> Transcribe</>
                                      )}
                                  </button>
                              )}
                          </div>
                      </div>

                      {/* Transcription Preview */}
                      {video.transcription && (
                          <div className="w-full md:w-1/3 bg-zinc-950/50 rounded-lg p-3 text-sm text-zinc-300 overflow-y-auto max-h-32 border border-white/5">
                              <p className="whitespace-pre-wrap">{video.transcription}</p>
                          </div>
                      )}
                  </div>
              ))
          )}
      </div>
    </div>
  );
}
