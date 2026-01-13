
import React, { useState, useEffect, useRef } from 'react';
import { 
  User,
  MessageCircle,
  Bot,
  Send,
  Heart,
  Plus,
  Image as ImageIcon,
  Mic,
  Square,
  Video,
  Phone
} from 'lucide-react';
import { AIReplyButton } from './AIReplyButton';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';

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
    attachment?: {
      type: 'image' | 'audio' | 'video';
      url: string;
    };
  };
  created_at: string;
}

export function SocialTab() {
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
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activePlatform, setActivePlatform] = useState<'instagram' | 'messenger' | 'whatsapp'>('instagram');

  // Initial Fetch
  useEffect(() => {
    fetchProfiles();

    // Subscribe to profile changes for Messenger
    let subscription: any = null;

    if (activePlatform === 'messenger') {
        subscription = supabase
            .channel('messenger-leads-changes')
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen to INSERT and UPDATE
                    schema: 'public',
                    table: 'messenger_leads'
                },
                (payload) => {
                    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                        // Refresh profiles or Optimistically update
                        // For simplicity, let's just re-fetch or map the single change
                        const newLead = payload.new as any;
                        const mappedProfile: InstagramProfile = {
                            id: newLead.id,
                            user_id: newLead.psid,
                            username: `${newLead.first_name} ${newLead.last_name}`.trim(),
                            name: `${newLead.first_name} ${newLead.last_name}`.trim(),
                            profile_pic: newLead.profile_pic,
                            created_at: newLead.created_at,
                            updated_at: newLead.updated_at
                        };

                        setProfiles(prev => {
                            const index = prev.findIndex(p => p.id === mappedProfile.id);
                            if (index >= 0) {
                                // Update existing
                                const copy = [...prev];
                                copy[index] = mappedProfile;
                                return copy;
                            } else {
                                // Add new
                                return [mappedProfile, ...prev];
                            }
                        });
                        
                        // Also update selectedProfile if it matches
                        setSelectedProfile(current => {
                            if (current && current.id === mappedProfile.id) {
                                return mappedProfile;
                            }
                            return current;
                        });
                    }
                }
            )
            .subscribe();
    }

    return () => {
        if (subscription) supabase.removeChannel(subscription);
    };
  }, [activePlatform]);

  // Fetch chat history when selected profile changes
  useEffect(() => {
    if (selectedProfile) {
      fetchChatHistory(selectedProfile.user_id);
      
      const tableName = activePlatform === 'instagram' ? 'n8n_chat_histories' : 'messenger_messages';
      const filter = activePlatform === 'instagram' 
        ? `session_id=eq.${selectedProfile.user_id}` 
        : `lead_id=eq.${selectedProfile.id}`; // messenger_messages uses lead_id which is the UUID from messenger_leads

      const channel = supabase
        .channel('chat-updates')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: tableName,
            filter: filter
          },
          (payload) => {
            const newRecord = payload.new;
            
            let newMsg: ChatMessage;

            if (activePlatform === 'instagram') {
                 newMsg = newRecord as ChatMessage;
            } else {
                // Map messenger message to ChatMessage format
                 newMsg = {
                    id: newRecord.id, // This is UUID, ChatMessage expects number currently... we might need to update interface
                    // TEMPORARY FIX: map UUID to random number or change interface. 
                    // Better verify interface. The interface ChatMessage has id: number.
                    // But messenger_messages has UUID.
                    // We should update ChatMessage interface to string | number or just string.
                    // For now, let's cast to any to avoid TS error in this block, but we MUST update interface.
                    session_id: selectedProfile.user_id, 
                    message: {
                        type: newRecord.direction === 'outbound' ? 'me' : 'human',
                        content: newRecord.content,
                        attachment: newRecord.type === 'image' || newRecord.type === 'audio' ? {
                            type: newRecord.type as 'image' | 'audio',
                            url: newRecord.content // Content holds URL for attachments
                        } : undefined
                    },
                    created_at: newRecord.created_at
                 } as ChatMessage; // Cast to ChatMessage after updating interface
            }

            setChatMessages((prev) => {
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
  }, [selectedProfile, activePlatform]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const fetchProfiles = async () => {
    setLoadingProfiles(true);
    setProfiles([]); 
    setSelectedProfile(null);

    try {
      if (activePlatform === 'instagram') {
          const { data, error } = await supabase
            .from('instagram_user_profiles')
            .select('*');
          
          if (error) throw error;
          setProfiles(data || []);
      } else {
          // Fetch Messenger Leads
          const { data, error } = await supabase
            .from('messenger_leads')
            .select('*');
            
          if (error) throw error;
          
          // Map to InstagramProfile interface for consistency
          const mappedProfiles: InstagramProfile[] = (data || []).map(lead => ({
              id: lead.id, // UUID
              user_id: lead.psid, // PSID as user_id
              username: `${lead.first_name} ${lead.last_name}`.trim(), // Use name as username
              name: `${lead.first_name} ${lead.last_name}`.trim(),
              profile_pic: lead.profile_pic,
              created_at: lead.created_at,
              updated_at: lead.updated_at
          }));
          
          setProfiles(mappedProfiles);
      }
    } catch (err) {
      console.error('Error fetching profiles:', err);
    } finally {
      setLoadingProfiles(false);
    }
  };

  const fetchChatHistory = async (userId: string) => {
    setLoadingChat(true);
    try {
      if (activePlatform === 'instagram') {
          const { data, error } = await supabase
            .from('n8n_chat_histories')
            .select('*')
            .eq('session_id', userId)
            .order('created_at', { ascending: true });

          if (error) throw error;
          setChatMessages(data || []);
      } else {
          // Fetch Messenger Messages
          // We need the lead_id (UUID) not PSID.
          // selectedProfile.id maps to messenger_leads.id (UUID)
          if (!selectedProfile?.id) return;

          const { data, error } = await supabase
            .from('messenger_messages')
            .select('*')
            .eq('lead_id', selectedProfile.id) // Use the UUID we mapped to profile.id
            .order('created_at', { ascending: true });

          if (error) throw error;

          // Map to ChatMessage interface
          const mappedMessages: ChatMessage[] = (data || []).map(msg => ({
              id: msg.id, // UUID
              session_id: userId,
              message: {
                  type: msg.direction === 'outbound' ? 'me' : 'human',
                  content: msg.type === 'text' ? msg.content : '',
                  attachment: msg.type !== 'text' ? {
                      type: msg.type as 'image' | 'audio', // Assuming these are the only non-text types
                      url: msg.content
                  } : undefined
              },
              created_at: msg.created_at
          }));

          setChatMessages(mappedMessages);
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
      if (activePlatform === 'instagram') {
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
          } else if (data?.error) {
              console.error('Instagram API Error via Edge Function:', data.error);
          } else {
            console.log('Message sent successfully via Edge Function');
          }
      } else {
          // ... Messenger Logic ...
          // 1. Store in DB
          const { data: insertedMsg, error } = await supabase
            .from('messenger_messages')
            .insert({
                lead_id: selectedProfile.id, // UUID from messenger_leads
                message_id: `out_${Date.now()}`, // Temporary ID for Messenger's message_id
                content: messageText,
                type: 'text',
                direction: 'outbound',
                created_at: new Date().toISOString()
            })
            .select()
            .single();

          if (error) throw error;

          // Map back to ChatMessage for state update
           const mappedMsg: ChatMessage = {
              id: insertedMsg.id, // Use the actual UUID from DB
              session_id: selectedProfile.user_id,
              message: {
                  type: 'me',
                  content: insertedMsg.content
              },
              created_at: insertedMsg.created_at
          };

          setChatMessages(prev => prev.map(msg => 
            msg.id === optimisticMessage.id ? mappedMsg : msg
          ));

          // 2. Send via Edge Function
          const { data, error: functionError } = await supabase.functions.invoke('send-messenger-message', {
            body: {
              recipient_id: selectedProfile.user_id, // This is the PSID for Messenger
              message_text: messageText,
            },
          });

          if (functionError) {
             console.error('Edge Function Error:', functionError);
             alert('Failed to send message via Messenger API');
          } else if (data?.error) {
             console.error('FB API Error:', data.error);
             alert('Facebook API Error: ' + JSON.stringify(data.error));
          }
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      setChatMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
      alert('Failed to send message. Please try again.');
      setInputMessage(messageText); 
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
        const { error: uploadError } = await supabase.storage
            .from('chat-uploads')
            .upload(fileName, file);

        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

        // 2. Get Signed URL
        const { data: signedData, error: signedError } = await supabase.storage
            .from('chat-uploads')
            .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 Year validity

        if (signedError || !signedData?.signedUrl) throw new Error('Failed to generate signed URL');
        const finalUrl = signedData.signedUrl;

        // 3. Save to DB
        if (activePlatform === 'instagram') {
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
        } else {
            // Messenger image upload
            const { data: insertedMsg, error: dbError } = await supabase
                .from('messenger_messages')
                .insert({
                    lead_id: selectedProfile.id,
                    message_id: `out_img_${Date.now()}`,
                    content: finalUrl, // URL is the content for attachments
                    type: 'image',
                    direction: 'outbound',
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (dbError) throw dbError;

            const mappedMsg: ChatMessage = {
                id: insertedMsg.id,
                session_id: selectedProfile.user_id,
                message: {
                    type: 'me',
                    content: '',
                    attachment: {
                        type: 'image',
                        url: insertedMsg.content
                    }
                },
                created_at: insertedMsg.created_at
            };

            if (insertedMsg) {
                setChatMessages(prev => prev.map(msg => 
                msg.id === optimisticId ? mappedMsg : msg
                ));
            }

            const { data, error: functionError } = await supabase.functions.invoke('send-messenger-message', {
                body: {
                    recipient_id: selectedProfile.user_id,
                    attachment: {
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
                console.error('Messenger API Error:', data.error);
            }
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

      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
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
        attachment: {
            type: 'audio',
            url: URL.createObjectURL(audioBlob) // Local URL for immediate display
        }
      },
      created_at: new Date().toISOString()
    };
    setChatMessages(prev => [...prev, optimisticMessage]);

    let ext = 'webm';
    if (mimeType.includes('mp4')) ext = 'mp4';
    else if (mimeType.includes('wav')) ext = 'wav';
    
    const fileName = `${Date.now()}-voice-message.${ext}`;

    try {
        // 1. Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
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
        if (activePlatform === 'instagram') {
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
        } else {
            // Messenger voice message upload
            const { data: insertedMsg, error: dbError } = await supabase
                .from('messenger_messages')
                .insert({
                    lead_id: selectedProfile.id,
                    message_id: `out_aud_${Date.now()}`,
                    content: finalUrl,
                    type: 'audio',
                    direction: 'outbound',
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (dbError) throw dbError;

            const mappedMsg: ChatMessage = {
                id: insertedMsg.id,
                session_id: selectedProfile.user_id,
                message: {
                    type: 'me',
                    content: 'Sent a voice message',
                    attachment: {
                        type: 'audio',
                        url: insertedMsg.content
                    }
                },
                created_at: insertedMsg.created_at
            };

            if (insertedMsg) {
                setChatMessages(prev => prev.map(msg => 
                    msg.id === optimisticId ? mappedMsg : msg
                ));
            }

            const { data, error: functionError } = await supabase.functions.invoke('send-messenger-message', {
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
                console.error('Messenger API Error:', data.error);
                const errMsg = data.error.error?.message || JSON.stringify(data.error);
                alert(`Messenger Error: ${errMsg}`);
            }
        }

    } catch (error: unknown) {
        console.error('Error sending voice message:', error);
        setChatMessages(prev => prev.filter(msg => msg.id !== optimisticId)); // Revert optimistic update
        const errorMessage = error instanceof Error ? error.message : String(error);
        alert(`Failed to send voice message: ${errorMessage}`);
    } finally {
        setSending(false);
        URL.revokeObjectURL(optimisticMessage.message.attachment!.url); // Clean up local URL
    }
  }

  const handleSendSticker = async () => {
    if (!selectedProfile || sending) return;
    setSending(true);

    const stickerContent = '❤️'; 

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
      if (activePlatform === 'instagram') {
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
      } else {
          // Messenger does not have a direct "like heart" sticker API like Instagram.
          // We can send a text message with the heart emoji instead.
          const { data: insertedMsg, error: dbError } = await supabase
            .from('messenger_messages')
            .insert({
                lead_id: selectedProfile.id,
                message_id: `out_like_${Date.now()}`,
                content: stickerContent,
                type: 'text',
                direction: 'outbound',
                created_at: new Date().toISOString()
            })
            .select()
            .single();

          if (dbError) throw dbError;

          const mappedMsg: ChatMessage = {
              id: insertedMsg.id,
              session_id: selectedProfile.user_id,
              message: {
                  type: 'me',
                  content: insertedMsg.content
              },
              created_at: insertedMsg.created_at
          };

          if (insertedMsg) {
            setChatMessages(prev => prev.map(msg => 
                msg.id === optimisticMessage.id ? mappedMsg : msg
            ));
          }

          const { data, error: functionError } = await supabase.functions.invoke('send-messenger-message', {
            body: {
              recipient_id: selectedProfile.user_id,
              message_text: stickerContent, // Send as text message
            },
          });

          if (functionError) {
             console.error('Edge Function Error:', functionError);
             alert('Failed to send like via Messenger API');
          } else if (data?.error) {
             console.error('FB API Error:', data.error);
             alert('Facebook API Error: ' + JSON.stringify(data.error));
          }
      }

    } catch (error) {
      console.error('Error sending sticker:', error);
      setChatMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
      alert('Failed to send sticker.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex-1 min-h-[500px] flex overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/30">
        <div className="flex w-full h-full">
            {/* Left Section: User List */}
            <div className="w-1/3 min-w-[250px] border-r border-white/5 bg-zinc-900/50 flex flex-col">
                <div className="p-4 border-b border-white/5 bg-zinc-900/80 backdrop-blur-sm sticky top-0 z-10 space-y-3">
                    <h2 className="font-bold text-sm text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                        <MessageCircle className="size-4" />
                        Messages
                    </h2>
                    
          {/* Tabs */}
        <div className="flex items-center gap-2 mb-6">
            <button 
                onClick={() => setActivePlatform('instagram')}
                className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    activePlatform === 'instagram' 
                        ? "bg-violet-600 text-white" 
                        : "bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800"
                )}
            >
                <div className="bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-500 rounded-md p-1">
                    <svg viewBox="0 0 24 24" fill="white" className="w-3 h-3">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                </div>
                Instagram
            </button>
            <button 
                onClick={() => setActivePlatform('messenger')}
                className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    activePlatform === 'messenger' 
                        ? "bg-blue-600 text-white" 
                        : "bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800"
                )}
            >
                <div className="bg-blue-500 rounded-full p-1">
                    <svg viewBox="0 0 24 24" fill="white" className="w-3 h-3">
                        <path d="M12 2a10 10 0 0 0-9.85 11.23L.5 22l8.77-1.65A10 10 0 1 0 12 2zm1 14.5-2.5-2.5-5 5 5.5-5.5 2.5 2.5 5-5-5.5 5.5z"/>
                    </svg>
                </div>
                Messenger
            </button>
            <button 
                onClick={() => setActivePlatform('whatsapp')}
                className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    activePlatform === 'whatsapp' 
                        ? "bg-green-600 text-white" 
                        : "bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800"
                )}
            >
                <div className="bg-green-500 rounded-full p-1">
                    <Phone className="w-3 h-3 text-white" />
                </div>
                WhatsApp
            </button>
                </div>
            </div>

            {activePlatform === 'whatsapp' ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-zinc-900/20 rounded-2xl border border-zinc-800/50">
                    <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-6">
                        <Phone className="w-10 h-10 text-green-500" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">WhatsApp Integration</h3>
                    <p className="text-zinc-400 max-w-md">
                        We are currently working on this feature. Check back soon for seamless WhatsApp messaging directly from your dashboard.
                    </p>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[600px]">
                    {loadingProfiles ? (
                        <div className="flex items-center justify-center py-10">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-500"></div>
                        </div>
                    ) : profiles.length > 0 ? (
                        profiles.map((profile) => (
                            <button 
                                key={String(profile.id)} 
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
                                    <p className="text-zinc-500 text-xs truncate">
                                        {activePlatform === 'messenger' ? 'Messenger User' : `@${profile.username}`}
                                    </p>
                                </div>
                            </button>
                        ))
                    ) : (
                        <div className="p-4 text-center text-zinc-500 text-sm">
                            No {activePlatform} profiles found.
                        </div>
                    )}
                </div>
            )}
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
                        <p className="text-xs text-zinc-500">
                             {activePlatform === 'messenger' ? 'MESSENGER' : `@${selectedProfile.username}`}
                        </p>
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
                        const content = msg.message.content || msg.message.message || '';
                        const attachment = msg.message.attachment; 
                        const type = msg.message.type || 'human';

                        return (
                            <div 
                            key={String(msg.id)} 
                            className={cn(
                                "flex gap-3 max-w-3xl",
                                type === 'ai' || type === 'me' ? "ml-auto flex-row-reverse" : ""
                            )}
                            >
                            {/* Avatar */}
                            <div className={cn(
                                "shrink-0 size-8 rounded-full flex items-center justify-center border",
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
                            placeholder={activePlatform === 'messenger' ? "Message..." : "Type a message..."}
                            className="flex-1 bg-zinc-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all placeholder:text-zinc-600"
                            disabled={sending || !selectedProfile}
                            />
                        )}

                        {!isRecording && (
                          <div className="flex gap-2">
                             <AIReplyButton
                                context={chatMessages.slice(-5).map(m => 
                                    `${m.message.type === 'me' ? 'Me' : 'User'}: ${m.message.content || '[Attachment]'}`
                                ).join('\n')}
                                onGenerate={(reply) => setInputMessage(reply)}
                                platform={activePlatform}
                                className="p-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-xl"
                            />
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
                          </div>
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
    </div>
  );
}

