import React, { useState } from 'react';
import { 
  Share2, 
  Calendar, 
  Video, 
  Menu,
  X 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Footer } from '../components/Footer';
import { cn } from '../lib/utils';

type Tab = 'social' | 'schedule' | 'video';

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState<Tab>('social');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
          <div className="flex-1 p-6 md:p-10">
              <header className="mb-8">
                  <h1 className="text-3xl font-bold">{tabs.find(t => t.id === activeTab)?.label}</h1>
                  <p className="text-zinc-400 mt-2">Manage your {activeTab} activities.</p>
              </header>
              
              <div className="rounded-2xl border border-white/5 bg-zinc-900/50 p-6 min-h-[400px]">
                  {/* Placeholder Content */}
                  <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-4 py-20">
                      {activeTab === 'social' && <Share2 className="size-16 opacity-20" />}
                      {activeTab === 'schedule' && <Calendar className="size-16 opacity-20" />}
                      {activeTab === 'video' && <Video className="size-16 opacity-20" />}
                      <p>Content for {activeTab} goes here.</p>
                  </div>
              </div>
          </div>
          <Footer />
      </main>
    </div>
  );
}
