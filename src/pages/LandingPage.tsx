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
  Send
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
    type: 'human' | 'ai';
    content: string;
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
  const chatBottomRef = useRef<HTMLDivElement>(null);

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
        type: 'ai',
        content: messageText
      },
      created_at: new Date().toISOString()
    };

    setChatMessages(prev => [...prev, optimisticMessage]);

    try {
      const response = await fetch('https://n8n.kadoshai.com/webhook/send-dm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientId: selectedProfile.user_id,
          text: messageText
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Success - no persistent action needed here as n8n handles the DB insert.
      // We rely on the optimistic update for immediate feedback.
      // In a real app, you might re-fetch or use a realtime subscription to confirm.
      
    } catch (error) {
      console.error('Error sending message:', error);
      // Revert optimistic update (optional, but good practice)
      setChatMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
      alert('Failed to send message. Please try again.');
      setInputMessage(messageText); // Restore input
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
                                  chatMessages.map((msg) => (
                                    <div 
                                      key={msg.id} 
                                      className={cn(
                                        "flex gap-3 max-w-3xl",
                                        msg.message.type === 'ai' ? "ml-auto flex-row-reverse" : ""
                                      )}
                                    >
                                      {/* Avatar */}
                                      <div className={cn(
                                        "flex-shrink-0 size-8 rounded-full flex items-center justify-center border",
                                        msg.message.type === 'ai' 
                                          ? "bg-violet-600/20 border-violet-500/30 text-violet-400" 
                                          : "bg-zinc-800 border-white/10 text-zinc-400"
                                      )}>
                                        {msg.message.type === 'ai' ? <Bot className="size-4" /> : <User className="size-4" />}
                                      </div>

                                      {/* Message Bubble */}
                                      <div className={cn(
                                        "flex flex-col gap-1 min-w-[120px]",
                                        msg.message.type === 'ai' ? "items-end" : "items-start"
                                      )}>
                                         <div className={cn(
                                           "px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm",
                                           msg.message.type === 'ai' 
                                             ? "bg-violet-600 text-white rounded-tr-sm" 
                                             : "bg-zinc-800 text-zinc-200 rounded-tl-sm border border-white/5"
                                         )}>
                                           {msg.message.content}
                                         </div>
                                         <span className="text-[10px] text-zinc-600 px-1">
                                           {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                         </span>
                                      </div>
                                    </div>
                                  ))
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
                                <div className="flex gap-2">
                                  <input 
                                    type="text" 
                                    value={inputMessage}
                                    onChange={(e) => setInputMessage(e.target.value)}
                                    placeholder="Type a message..." 
                                    className="flex-1 bg-zinc-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all placeholder:text-zinc-600"
                                    disabled={sending || !selectedProfile}
                                  />
                                  <button 
                                    type="submit"
                                    disabled={!inputMessage.trim() || sending || !selectedProfile}
                                    className="bg-violet-600 hover:bg-violet-500 disabled:bg-white/5 disabled:text-zinc-500 disabled:hover:bg-white/5 text-white p-3 rounded-xl transition-colors"
                                  >
                                    {sending ? (
                                        <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <Send className="size-5" />
                                    )}
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
