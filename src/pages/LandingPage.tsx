
import { useState, useEffect } from 'react';
import { 
  LayoutDashboard,
  Share2, 
  Calendar, 
  Video, 
  Menu,
  X,
  LogOut,
  User as UserIcon,
  Rss,
  Image as ImageIcon,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Footer } from '../components/Footer';
import { cn } from '../lib/utils';
import { DashboardTab } from '../components/dashboard/DashboardTab';
import { SocialTab } from '../components/dashboard/SocialTab';
import ScheduleTab from '../components/dashboard/ScheduleTab';
import { VideoTab } from '../components/dashboard/VideoTab';
import { MyFeedTab } from '../components/dashboard/MyFeedTab';
import { ImageTab } from '../components/dashboard/ImageTab';
import { RepurposeTab } from '../components/dashboard/RepurposeTab';
import { NotificationBell } from '../components/dashboard/Notifications';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

type Tab = 'dashboard' | 'feed' | 'social' | 'schedule' | 'video' | 'image' | 'repurpose';

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
      await supabase.auth.signOut();
      // User state will update automatically via listener
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'feed', label: 'My Feed', icon: Rss },
    { id: 'social', label: 'Social', icon: Share2 },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'video', label: 'Video', icon: Video },
    { id: 'image', label: 'Image', icon: ImageIcon },
    { id: 'repurpose', label: 'Repurpose', icon: Sparkles },
  ];

  return (
    <div className="flex min-h-screen bg-zinc-950 text-white font-sans selection:bg-violet-500/30">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-zinc-900/50 border-r border-white/5 fixed top-0 bottom-0 left-0 z-40 backdrop-blur-xl">
<div className="p-6 border-b border-zinc-200 bg-white shadow-sm">
             <div className="flex flex-col items-center gap-3 text-center">
                 <img src="/kadoshAI-removebg.png" alt="KadoshAI Logo" className="h-12 w-auto" />
                 <span className="font-bold text-lg tracking-tight text-zinc-950">Social Deal Maker</span>
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
        <div className="p-4 border-t border-white/5">
             {user ? (
                 <div className="flex flex-col gap-3">
                     <div className="flex items-center gap-2 px-2">
                         <div className="size-8 rounded-full bg-violet-600/20 flex items-center justify-center text-violet-400">
                             <UserIcon size={16} />
                         </div>
                         <div className="flex-1 min-w-0">
                             <p className="text-sm font-medium truncate">{user.email}</p>
                             <p className="text-xs text-zinc-500">Free Plan</p>
                         </div>
                     </div>
                     <button
                         onClick={handleLogout}
                         className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors"
                     >
                         <LogOut size={16} /> Log Out
                     </button>
                 </div>
             ) : (
                 <button
                     onClick={() => window.location.href = '/login'}
                     className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors"
                 >
                     Log In
                 </button>
             )}
        </div>
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
                  <div className="p-4 border-t border-white/5">
                       {user ? (
                           <div className="flex flex-col gap-4">
                               <div className="flex items-center gap-3 px-2">
                                   <div className="size-10 rounded-full bg-violet-600/20 flex items-center justify-center text-violet-400">
                                       <UserIcon size={20} />
                                   </div>
                                   <div className="flex-1 min-w-0">
                                       <p className="text-base font-medium truncate">{user.email}</p>
                                   </div>
                               </div>
                               <button
                                   onClick={handleLogout}
                                   className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-lg font-medium transition-colors"
                               >
                                   <LogOut size={20} /> Log Out
                               </button>
                           </div>
                       ) : (
                           <button
                               onClick={() => window.location.href = '/login'}
                               className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-lg font-medium transition-colors"
                           >
                               Log In
                           </button>
                       )}
                  </div>
              </motion.div>
          )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 md:pl-64 flex flex-col min-h-screen pt-16 md:pt-0">
          <div className="flex-1 p-4 md:p-6 flex flex-col">
              <header className="mb-6 flex items-start justify-between">
                  <div>
                      <h1 className="text-2xl font-bold">{tabs.find(t => t.id === activeTab)?.label}</h1>
                      <p className="text-zinc-400 text-sm">
                        {activeTab === 'dashboard' ? 'Overview of your performance.' : `Manage your ${activeTab} activities.`}
                      </p>
                  </div>
                  <NotificationBell />
              </header>
              
              {activeTab === 'dashboard' && <DashboardTab />}
              {activeTab === 'feed' && <MyFeedTab />}
              {activeTab === 'social' && <SocialTab />}
              {activeTab === 'schedule' && <ScheduleTab />}
              {activeTab === 'video' && <VideoTab />}
              {activeTab === 'image' && <ImageTab />}
              {activeTab === 'repurpose' && <RepurposeTab />}
          </div>
          <Footer />
      </main>
    </div>
  );
}
