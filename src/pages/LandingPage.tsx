import React, { useState, useEffect, useRef } from 'react';
import { 
  Share2, 
  Calendar, 
  Video, 
  Menu,
  X,
  User,
  MessageCircle,
  Bot,
  Send,
  Heart,
  Plus,
  Image as ImageIcon,
  Mic,
  Square
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Footer } from '../components/Footer';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

type Tab = 'social' | 'schedule' | 'video';

interface InstagramProfile {
  id: number;
  user_id: string;
  username: string;
  name: string;
  profile_pic: string;
  created_at: string;
  updated_at: string;
}

interface ChatMessage {
  id: number;
  session_id: string;
  message: {
    type?: 'human' | 'ai' | 'me';
    content?: string;
    message?: string;
  };
  created_at: string;
}

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState<Tab>('social');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [profiles, setProfiles] = useState<InstagramProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  
  // Chat State
  const [selectedProfile, setSelectedProfile] = useState<InstagramProfile | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [isMediaMenuOpen, setIsMediaMenuOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Set the "Social" tab fetching side-effect
  useEffect(() => {
    if (activeTab === 'social') {
      fetchProfiles();
    }
  }, [activeTab]);

  // Fetch chat history when selected profile changes
  useEffect(() => {
    if (selectedProfile) {
      fetchChatHistory(selectedProfile.user_id);
      
      const channel = supabase
        .channel('chat-updates')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'n8n_chat_histories',
            filter: `session_id=eq.${selectedProfile.user_id}`
          },
          (payload) => {
            const newMsg = payload.new as ChatMessage;
            setChatMessages((prev) => {
               // Simple deduplication check based on ID if possible, or assume new
               const exists = prev.some(msg => msg.id === newMsg.id);
               if (exists) return prev;
               return [...prev, newMsg];
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };

    } else {
      setChatMessages([]);
    }
  }, [selectedProfile]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const fetchProfiles = async () => {
    setLoadingProfiles(true);
    try {
      const { data, error } = await supabase
        .from('instagram_user_profiles')
        .select('*');
      
      if (error) {
        console.error('Error fetching profiles:', error);
      } else {
        setProfiles(data || []);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
    } finally {
      setLoadingProfiles(false);
    }
  };

  const fetchChatHistory = async (userId: string) => {
    setLoadingChat(true);
    try {
      const { data, error } = await supabase
        .from('n8n_chat_histories')
        .select('*')
        .eq('session_id', userId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching chat history:', error);
      } else {
        setChatMessages(data || []);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
    } finally {
      setLoadingChat(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputMessage.trim() || !selectedProfile || sending) return;

    const messageText = inputMessage.trim();
    setInputMessage('');
    setSending(true);

    // Optimistic Update
    const optimisticMessage: ChatMessage = {
      id: Date.now(), // Temporary ID
      session_id: selectedProfile.user_id,
      message: {
        type: 'me',
        content: messageText
      },
      created_at: new Date().toISOString()
    };

    setChatMessages(prev => [...prev, optimisticMessage]);

    try {
      const { data: insertedMsg, error } = await supabase
        .from('n8n_chat_histories')
        .insert({
          session_id: selectedProfile.user_id,
          message: {
            type: 'me',
            content: messageText
          }
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Update the optimistic message with the real ID from Supabase
      // This prevents the Realtime subscription from adding it again as a "new" message
      if (insertedMsg) {
         setChatMessages(prev => prev.map(msg => 
            msg.id === optimisticMessage.id ? insertedMsg : msg
         ));
      }

      // --- Instagram Secure Send (Edge Function) ---
      
      const { data, error: functionError } = await supabase.functions.invoke('send-instagram-message', {
        body: {
          recipient_id: selectedProfile.user_id,
          message_text: messageText,
        },
      });

      if (functionError) {
        console.error('Edge Function Error:', functionError);
        // alert('Failed to trigger send function');
      } else if (data?.error) {
         console.error('Instagram API Error via Edge Function:', data.error);
      } else {
        console.log('Message sent successfully via Edge Function');
      }
      // ---------------------------------------------
      
    } catch (error) {
      console.error('Error sending message:', error);
      // Revert optimistic update
      setChatMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
      alert('Failed to send message. Please try again.');
      setInputMessage(messageText); // Restore input
    } finally {
      setSending(false);
    }
  };





  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
    // Reset input
    e.target.value = '';
    setIsMediaMenuOpen(false);
  };

  const handleFileUpload = async (file: File) => {
    if (!selectedProfile || sending) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        alert('Please select an image file.');
        return;
    }

    setSending(true);

    // Create a local URL for optimistic update
    const localUrl = URL.createObjectURL(file);
    const optimisticId = Date.now();

    const optimisticMessage: ChatMessage = {
      id: optimisticId,
      session_id: selectedProfile.user_id,
      message: {
        type: 'me',
        content: '', // No text content
        // @ts-ignore - Extending schema on the fly for UI
        attachment: {
            type: 'image',
            url: localUrl
        }
      },
      created_at: new Date().toISOString()
    };

    setChatMessages(prev => [...prev, optimisticMessage]);

    try {
        // 1. Upload to Supabase Storage
        const fileName = `${Date.now()}-${file.name.replace(/\s/g, '_')}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('chat-uploads')
            .upload(fileName, file);

        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

        // 2. Get Signed URL (Valid for 1 hour for display persistence, or less if strict)
        // Instagram needs to access it immediately. Messages history needs it long term? 
        // Actually, for persistent chat history, Signed URLs expire. 
        // IF the bucket is private, we need a way to view images later. 
        // OPTION: We use the signed URL for sending to Instagram (short expiry).
        // For our own UI, we might need a longer signed URL or proxy.
        // For now, I will regenerate a signed URL valid for 10 years for the database record 
        // OR we accept that private images in chat history need fresh signing on load (complex).
        // USER REQUESTED PRIVACY. I will use a signed URL with a long expiry (e.g. 1 week or 1 year) for the DB 
        // tailored to the message. Or just 60 seconds for IG and let our app verify rights later?
        // Let's go with a 1-hour signed URL for now to ensure IG gets it.
        // NOTE: If the bucket is private, the 'url' saved in `n8n_chat_histories` will stop working after expiry.
        // This is a trade-off for privacy. 
        
        const { data: signedData, error: signedError } = await supabase.storage
            .from('chat-uploads')
            .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 Year validity for simplicity in this MVP

        if (signedError || !signedData?.signedUrl) throw new Error('Failed to generate signed URL');
        const finalUrl = signedData.signedUrl;

        // 3. Save to DB
        const { data: insertedMsg, error: dbError } = await supabase
            .from('n8n_chat_histories')
            .insert({
                session_id: selectedProfile.user_id,
                message: {
                    type: 'me',
                    content: 'Sent an image',
                    attachment: {
                        type: 'image',
                        url: finalUrl
                    }
                }
            })
            .select()
            .single();

        if (dbError) throw dbError;

        if (insertedMsg) {
            setChatMessages(prev => prev.map(msg => 
               msg.id === optimisticId ? insertedMsg : msg
            ));
        }

        // 4. Send via Edge Function
        // Using strict payload as per user's curl structure requirement
        const { data, error: functionError } = await supabase.functions.invoke('send-instagram-message', {
            body: {
                recipient_id: selectedProfile.user_id,
                attachments: {
                    type: 'image',
                    payload: {
                        url: finalUrl
                    }
                }
            },
        });

        if (functionError) {
             console.error('Edge Function Error:', functionError);
        } else if (data?.error) {
             console.error('Instagram API Error:', data.error);
        }

    } catch (error) {
        console.error('Error sending image:', error);
        setChatMessages(prev => prev.filter(msg => msg.id !== optimisticId));
        alert('Failed to send image. Ensure "chat-uploads" bucket exists.');
    } finally {
        setSending(false);
        URL.revokeObjectURL(localUrl); // Cleanup
    }
  };

  // References for AudioContext recording
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const audioBuffersRef = useRef<Float32Array[]>([]);

  // Function to convert float32 audio buffers to WAV Blob
  const exportWAV = (buffers: Float32Array[], sampleRate: number): Blob => {
    const bufferLength = buffers.reduce((acc, output) => acc + output.length, 0);
    const wavBuffer = new ArrayBuffer(44 + bufferLength * 2);
    const view = new DataView(wavBuffer);

    const writeString = (view: DataView, offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };

    // RIFF chunk descriptor
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + bufferLength * 2, true);
    writeString(view, 8, 'WAVE');
    // fmt sub-chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM (uncompressed)
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true); // block align
    view.setUint16(34, 16, true); // bits per sample
    // data sub-chunk
    writeString(view, 36, 'data');
    view.setUint32(40, bufferLength * 2, true);

    // Write PCM samples
    let offset = 44;
    for (let i = 0; i < buffers.length; i++) {
        const buffer = buffers[i];
        for (let j = 0; j < buffer.length; j++, offset += 2) {
            const s = Math.max(-1, Math.min(1, buffer[j]));
            view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }
    }

    return new Blob([view], { type: 'audio/wav' });
  };

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioBuffersRef.current = [];

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      // Create a ScriptProcessorNode with a bufferSize of 4096 and a single input/output channel
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      scriptProcessorRef.current = processor;

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        // Copy buffer to avoid data being overwritten
        audioBuffersRef.current.push(new Float32Array(inputData));
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Could not access microphone. Please allow permissions.');
    }
  };

  const handleStopRecording = () => {
    if (scriptProcessorRef.current && audioContextRef.current && mediaStreamRef.current) {
      // Disconnect and stop
      scriptProcessorRef.current.disconnect();
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      
      const sampleRate = audioContextRef.current.sampleRate;
      audioContextRef.current.close();

      // Export to WAV
      const wavBlob = exportWAV(audioBuffersRef.current, sampleRate);
      handleVoiceUpload(wavBlob, 'audio/wav');
      
      setIsRecording(false);
      
      // Cleanup
      scriptProcessorRef.current = null;
      audioContextRef.current = null;
      mediaStreamRef.current = null;
      audioBuffersRef.current = [];
    }
  };

  const handleVoiceUpload = async (audioBlob: Blob, mimeType: string) => {
    if (!selectedProfile) return;
    setSending(true);

    // Optimistic Update
    const optimisticId = Date.now();
    const optimisticMessage: ChatMessage = {
      id: optimisticId,
      session_id: selectedProfile.user_id,
      message: {
        type: 'me',
        content: 'Sending voice message...',
        // @ts-ignore - Extending schema on the fly for UI
        attachment: {
            type: 'audio',
            url: URL.createObjectURL(audioBlob) // Local URL for immediate display
        }
      },
      created_at: new Date().toISOString()
    };
    setChatMessages(prev => [...prev, optimisticMessage]);

    // Instagram prefers mp4/m4a, but WAV is also widely supported as uncompressed audio.
    // If we recorded as WAV, use wav.
    let ext = 'webm';
    if (mimeType.includes('mp4')) ext = 'mp4';
    else if (mimeType.includes('wav')) ext = 'wav';
    
    const fileName = `${Date.now()}-voice-message.${ext}`;

    try {
        // 1. Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('chat-uploads')
            .upload(fileName, audioBlob, {
                contentType: mimeType
            });

        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

        // 2. Get Signed URL
        const { data: signedData, error: signedError } = await supabase.storage
            .from('chat-uploads')
            .createSignedUrl(fileName, 60 * 60 * 24 * 365); 

        if (signedError || !signedData?.signedUrl) throw new Error('Failed to generate signed URL');
        const finalUrl = signedData.signedUrl;

        // 3. Save to DB 
        const { data: insertedMsg, error: dbError } = await supabase
            .from('n8n_chat_histories')
            .insert({
                session_id: selectedProfile.user_id,
                message: {
                    type: 'me',
                    content: 'Sent a voice message',
                    attachment: {
                        type: 'audio',
                        url: finalUrl
                    }
                }
            })
            .select()
            .single();

        if (dbError) throw dbError;

        if (insertedMsg) {
             setChatMessages(prev => prev.map(msg => 
                msg.id === optimisticId ? insertedMsg : msg
             ));
        }

        // 4. Send via Edge Function
        // Using strict user curl structure
        const { data, error: functionError } = await supabase.functions.invoke('send-instagram-message', {
            body: {
                recipient_id: selectedProfile.user_id,
                attachment: {
                    type: 'audio', 
                    payload: {
                        url: finalUrl
                    }
                }
            },
        });

        if (functionError) {
             console.error('Edge Function Network Error:', functionError);
             alert(`Network Error: ${functionError.message}`);
        } else if (data?.error) {
             console.error('Instagram API Error:', data.error);
             const errMsg = data.error.error?.message || JSON.stringify(data.error);
             alert(`Instagram Error: ${errMsg}`);
        }

    } catch (error: any) {
        console.error('Error sending voice message:', error);
        setChatMessages(prev => prev.filter(msg => msg.id !== optimisticId)); // Revert optimistic update
        alert(`Failed to send voice message: ${error.message || error}`);
    } finally {
        setSending(false);
        URL.revokeObjectURL(optimisticMessage.message.attachment.url); // Clean up local URL
    }
  }

  const handleSendSticker = async () => {
    if (!selectedProfile || sending) return;
    setSending(true);

    const stickerContent = '❤️'; // Represent sticker in history as emoji

    // Optimistic Update
    const optimisticMessage: ChatMessage = {
      id: Date.now(), 
      session_id: selectedProfile.user_id,
      message: {
        type: 'me',
        content: stickerContent
      },
      created_at: new Date().toISOString()
    };

    setChatMessages(prev => [...prev, optimisticMessage]);

    try {
      // 1. Save to Database (History)
      const { data: insertedMsg, error: dbError } = await supabase
        .from('n8n_chat_histories')
        .insert({
          session_id: selectedProfile.user_id,
          message: {
            type: 'me',
            content: stickerContent
          }
        })
        .select()
        .single();
      
      if (dbError) throw dbError;

       if (insertedMsg) {
         setChatMessages(prev => prev.map(msg => 
            msg.id === optimisticMessage.id ? insertedMsg : msg
         ));
      }

      // 2. Send via Edge Function
      const { data, error: functionError } = await supabase.functions.invoke('send-instagram-message', {
        body: {
          recipient_id: selectedProfile.user_id,
          attachment: {
            type: 'like_heart'
          }
        },
      });

      if (functionError) {
        console.error('Edge Function Error:', functionError);
      } else if (data?.error) {
         console.error('Instagram API Error via Edge Function:', data.error);
      } else {
        console.log('Sticker sent successfully');
      }

    } catch (error) {
      console.error('Error sending sticker:', error);
      setChatMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
      alert('Failed to send sticker.');
    } finally {
      setSending(false);
    }
  };

  const tabs = [
    { id: 'social', label: 'Social', icon: Share2 },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'video', label: 'Video', icon: Video },
  ];

  return (
    <div className="flex min-h-screen bg-zinc-950 text-white font-sans selection:bg-violet-500/30">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-zinc-900/50 border-r border-white/5 fixed top-0 bottom-0 left-0 z-40 backdrop-blur-xl">
        <div className="p-6 border-b border-white/5">
             <div className="flex items-center gap-2">
                 <img src="/kadoshAI-removebg.png" alt="KadoshAI Logo" className="h-8 w-auto" />
                 <span className="font-bold text-lg tracking-tight">Social Deal Maker</span>
             </div>
        </div>
        <nav className="flex-1 p-4 space-y-2">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as Tab)}
                    className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group text-left",
                        activeTab === tab.id 
                            ? "bg-violet-600/10 text-violet-400 border border-violet-500/20" 
                            : "text-zinc-400 hover:text-white hover:bg-white/5"
                    )}
                >
                    <tab.icon className={cn("size-5", activeTab === tab.id ? "text-violet-400" : "text-zinc-500 group-hover:text-white")} />
                    {tab.label}
                </button>
            ))}
        </nav>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-zinc-950/80 backdrop-blur-xl border-b border-white/5 z-50 flex items-center justify-between px-6">
          <div className="flex items-center gap-2">
             <img src="/kadoshAI-removebg.png" alt="KadoshAI Logo" className="h-8 w-auto" />
             <span className="font-bold text-lg tracking-tight">Social Deal Maker</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-zinc-400">
              {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
          {isMobileMenuOpen && (
              <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '-100%' }}
                  className="fixed inset-0 z-40 bg-zinc-950 md:hidden pt-20"
              >
                  <nav className="p-4 space-y-2">
                      {tabs.map((tab) => (
                          <button
                              key={tab.id}
                              onClick={() => {
                                  setActiveTab(tab.id as Tab);
                                  setIsMobileMenuOpen(false);
                              }}
                              className={cn(
                                  "w-full flex items-center gap-3 px-4 py-4 rounded-xl text-lg font-medium transition-all duration-200 text-left",
                                  activeTab === tab.id 
                                      ? "bg-violet-600/10 text-violet-400 border border-violet-500/20" 
                                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                              )}
                          >
                              <tab.icon className={cn("size-6", activeTab === tab.id ? "text-violet-400" : "text-zinc-500")} />
                              {tab.label}
                          </button>
                      ))}
                  </nav>
              </motion.div>
          )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 md:pl-64 flex flex-col min-h-screen pt-16 md:pt-0">
          <div className="flex-1 p-4 md:p-6 flex flex-col">
              <header className="mb-6">
                  <h1 className="text-2xl font-bold">{tabs.find(t => t.id === activeTab)?.label}</h1>
                  <p className="text-zinc-400 text-sm">Manage your {activeTab} activities.</p>
              </header>
              
              <div className="flex-1 min-h-[500px] flex overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/30">
                  {activeTab === 'social' ? (
                    <div className="flex w-full h-full">
                       {/* Left Section: User List */}
                       <div className="w-1/3 min-w-[250px] border-r border-white/5 bg-zinc-900/50 flex flex-col">
                          <div className="p-4 border-b border-white/5 bg-zinc-900/80 backdrop-blur-sm sticky top-0 z-10">
                            <h2 className="font-bold text-sm text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                              <MessageCircle className="size-4" />
                              Messages
                            </h2>
                          </div>
                          
                          {/* User List Container with max-height for scrolling */}
                          <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[600px]">
                             {loadingProfiles ? (
                               <div className="flex items-center justify-center py-10">
                                 <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-500"></div>
                               </div>
                             ) : profiles.length > 0 ? (
                               profiles.map((profile) => (
                                 <button 
                                   key={profile.id} 
                                   onClick={() => setSelectedProfile(profile)}
                                   className={cn(
                                     "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left group border border-transparent",
                                     selectedProfile?.id === profile.id 
                                       ? "bg-violet-600/10 border-violet-500/20 shadow-lg shadow-violet-500/5"
                                       : "hover:bg-white/5"
                                   )}
                                 >
                                   <div className="relative">
                                     <div className={cn(
                                       "h-10 w-10 rounded-full overflow-hidden border transition-colors",
                                       selectedProfile?.id === profile.id 
                                         ? "border-violet-500" 
                                         : "border-white/10 group-hover:border-violet-500/50"
                                     )}>
                                       {profile.profile_pic ? (
                                         <img src={profile.profile_pic} alt={profile.name} className="h-full w-full object-cover" />
                                       ) : (
                                         <div className="h-full w-full bg-zinc-800 flex items-center justify-center">
                                            <User className="h-5 w-5 text-zinc-500" />
                                         </div>
                                       )}
                                     </div>
                                     <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-zinc-900"></div>
                                   </div>
                                   <div className="flex-1 min-w-0">
                                     <h3 className={cn(
                                       "font-semibold text-sm truncate",
                                       selectedProfile?.id === profile.id ? "text-violet-200" : "text-zinc-200"
                                     )}>
                                       {profile.name}
                                     </h3>
                                     <p className="text-zinc-500 text-xs truncate">@{profile.username}</p>
                                   </div>
                                 </button>
                               ))
                             ) : (
                               <div className="p-4 text-center text-zinc-500 text-sm">
                                  No profiles found.
                               </div>
                             )}
                          </div>
                       </div>

                       {/* Right Section: Chat Interface */}
                       <div className="flex-1 flex flex-col bg-zinc-950/50 relative">
                          {selectedProfile ? (
                            <>
                              {/* Chat Header */}
                              <div className="h-16 px-6 border-b border-white/5 flex items-center justify-between bg-zinc-900/50 backdrop-blur-sm">
                                <div className="flex items-center gap-3">
                                  <div className="h-9 w-9 rounded-full overflow-hidden border border-white/10">
                                     {selectedProfile.profile_pic ? (
                                       <img src={selectedProfile.profile_pic} alt={selectedProfile.name} className="h-full w-full object-cover" />
                                     ) : (
                                       <div className="h-full w-full bg-zinc-800 flex items-center justify-center">
                                          <User className="h-4 w-4 text-zinc-500" />
                                       </div>
                                     )}
                                  </div>
                                  <div>
                                    <h3 className="font-bold text-sm text-white">{selectedProfile.name}</h3>
                                    <p className="text-xs text-zinc-500">@{selectedProfile.username}</p>
                                  </div>
                                </div>
                                <div className="text-xs text-zinc-600 font-mono">
                                   ID: {selectedProfile.user_id}
                                </div>
                              </div>

                              {/* Chat Messages */}
                              <div className="flex-1 overflow-y-auto p-6 space-y-6 max-h-[600px]">
                                {loadingChat ? (
                                  <div className="flex flex-col items-center justify-center h-full gap-2">
                                     <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
                                     <p className="text-xs text-zinc-500">Loading conversation...</p>
                                  </div>
                                ) : chatMessages.length > 0 ? (
                                  chatMessages.map((msg) => {
                                    /* Handle both explicit schema and user simplified schema */
                                    const content = msg.message.content || msg.message.message || '';
                                    // @ts-ignore - Handle attachment property
                                    const attachment = msg.message.attachment; 
                                    /* Default to 'human' for incoming messages lacking type (simple schema) */
                                    const type = msg.message.type || 'human';

                                    return (
                                      <div 
                                        key={msg.id} 
                                        className={cn(
                                          "flex gap-3 max-w-3xl",
                                          type === 'ai' || type === 'me' ? "ml-auto flex-row-reverse" : ""
                                        )}
                                      >
                                        {/* Avatar */}
                                        <div className={cn(
                                          "flex-shrink-0 size-8 rounded-full flex items-center justify-center border",
                                          type === 'ai' || type === 'me'
                                            ? "bg-violet-600/20 border-violet-500/30 text-violet-400" 
                                            : "bg-zinc-800 border-white/10 text-zinc-400"
                                        )}>
                                          {(type === 'ai' || type === 'me') ? <Bot className="size-4" /> : <User className="size-4" />}
                                        </div>

                                        {/* Message Bubble */}
                                        <div className={cn(
                                          "flex flex-col gap-1 min-w-[120px]",
                                          type === 'ai' || type === 'me' ? "items-end" : "items-start"
                                        )}>
                                           <div className={cn(
                                             "px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm",
                                             type === 'ai' || type === 'me'
                                               ? "bg-violet-600 text-white rounded-tr-sm"
                                               : "bg-zinc-800 text-zinc-200 rounded-tl-sm border border-white/5"
                                           )}>
                                             {attachment && attachment.type === 'image' ? (
                                                <img 
                                                    src={attachment.url} 
                                                    alt="Attachment" 
                                                    className="max-w-[200px] rounded-lg border border-white/10 my-1" 
                                                />
                                             ) : attachment && attachment.type === 'audio' ? (
                                                 <audio controls src={attachment.url} className="w-[200px] h-8 mt-1" />
                                             ) : (
                                                content
                                             )}
                                           </div>
                                           <span className="text-[10px] text-zinc-600 px-1">
                                             {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                           </span>
                                        </div>
                                      </div>
                                    );
                                  })
                                ) : (
                                  <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-2 opacity-50">
                                     <MessageCircle className="size-12" />
                                     <p>No messages yet.</p>
                                  </div>
                                )}
                                <div ref={chatBottomRef} />
                              </div>

                              {/* Input Area */}
                              <form onSubmit={handleSendMessage} className="p-4 border-t border-white/5 bg-zinc-900/50 backdrop-blur-sm">
                                <div className="flex gap-2 relative">
                                  {/* Media Menu */}
                                  <div className="relative">
                                      <AnimatePresence>
                                        {isMediaMenuOpen && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                className="absolute bottom-full left-0 mb-3 bg-zinc-900 border border-white/10 rounded-xl shadow-xl overflow-hidden min-w-[150px] z-50 p-1"
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-left"
                                                >
                                                    <ImageIcon className="size-4 text-violet-400" />
                                                    Images
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled
                                                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-zinc-600 cursor-not-allowed rounded-lg text-left"
                                                >
                                                    <Video className="size-4" />
                                                    Videos
                                                </button>
                                            </motion.div>
                                        )}
                                      </AnimatePresence>
                                      <button
                                        type="button"
                                        onClick={() => setIsMediaMenuOpen(!isMediaMenuOpen)}
                                        className={cn(
                                            "bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white p-3 rounded-xl transition-all",
                                            isMediaMenuOpen && "bg-zinc-700 text-white rotate-45"
                                        )}
                                      >
                                        <Plus className="size-5" />
                                      </button>
                                  </div>

                                  <input 
                                     type="file"
                                     ref={fileInputRef}
                                     className="hidden"
                                     accept="image/*"
                                     onChange={handleFileSelect}
                                  />

                                  {isRecording ? (
                                      <div className="flex-1 flex items-center gap-3 bg-red-900/20 border border-red-500/30 rounded-xl px-4 py-3">
                                          <div className="size-2 bg-red-500 rounded-full animate-pulse" />
                                          <span className="text-red-400 text-sm font-medium">Recording...</span>
                                          <div className="flex-1" />
                                          <button
                                              type="button"
                                              onClick={handleStopRecording}
                                              className="text-white bg-red-600 hover:bg-red-500 p-1.5 rounded-lg transition-colors"
                                          >
                                              <Square className="size-4 fill-current" />
                                          </button>
                                      </div>
                                  ) : (
                                      <input 
                                        type="text" 
                                        value={inputMessage}
                                        onChange={(e) => setInputMessage(e.target.value)}
                                        placeholder="Type a message..." 
                                        className="flex-1 bg-zinc-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all placeholder:text-zinc-600"
                                        disabled={sending || !selectedProfile}
                                      />
                                  )}

                                  {!isRecording && (
                                     <button
                                         type="button"
                                         onClick={handleStartRecording}
                                         disabled={sending || !selectedProfile || !!inputMessage.trim()}
                                         className={cn(
                                            "p-3 rounded-xl transition-colors",
                                            inputMessage.trim() ? "text-zinc-600 cursor-not-allowed hidden" : "bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white"
                                         )}
                                         title="Voice Message"
                                     >
                                         <Mic className="size-5" />
                                     </button>
                                  )}
                                  
                                  <button 
                                    type="submit"
                                    disabled={!inputMessage.trim() || sending || !selectedProfile || isRecording}
                                    className="bg-violet-600 hover:bg-violet-500 disabled:bg-white/5 disabled:text-zinc-500 disabled:hover:bg-white/5 text-white p-3 rounded-xl transition-colors"
                                  >
                                    {sending ? (
                                        <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <Send className="size-5" />
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleSendSticker}
                                    disabled={sending || !selectedProfile}
                                    className="bg-pink-600 hover:bg-pink-500 disabled:bg-white/5 disabled:text-zinc-500 disabled:hover:bg-white/5 text-white p-3 rounded-xl transition-colors"
                                    title="Send Like"
                                  >
                                    <Heart className="size-5 fill-current" />
                                  </button>
                                </div>
                              </form>
                            </>
                          ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 p-8 text-center">
                              <div className="bg-zinc-900/50 p-6 rounded-full mb-4">
                                 <MessageCircle className="size-10 opacity-20" />
                              </div>
                              <h3 className="text-xl font-bold text-zinc-300 mb-2">Select a conversation</h3>
                              <p className="max-w-xs">Choose a profile from the left to start chatting or view their details.</p>
                            </div>
                          )}
                       </div>
                    </div>
                  ) : (
                      /* Placeholder for other tabs */
                      <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-4">
                          {activeTab === 'schedule' && <Calendar className="size-16 opacity-20" />}
                          {activeTab === 'video' && <Video className="size-16 opacity-20" />}
                          <p>Content for {activeTab} goes here.</p>
                      </div>
                  )}
              </div>
          </div>
          <Footer />
      </main>
    </div>
  );
}
