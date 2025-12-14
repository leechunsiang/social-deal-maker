import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Instagram, 
  Linkedin, 
  Twitter, 
  MessageSquare, 
  BarChart3, 
  Sparkles,
  Play,
  ArrowRight,
  Menu,
  X,
  Music2
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-violet-500/30">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-zinc-950/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
             <img src="/kadoshAI-removebg.png" alt="KadoshAI Logo" className="h-10 w-auto" />
            <span className="font-bold text-lg tracking-tight">Social Deal Maker</span>
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#testimonials" className="hover:text-white transition-colors">Testimonials</a>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Link to="/login" className="text-sm font-medium text-zinc-300 hover:text-white transition-colors">
              Login
            </Link>
            <Link to="/signup" className="group relative px-5 py-2 rounded-full bg-linear-to-r from-violet-600 to-cyan-500 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40 transition-all hover:scale-105 active:scale-95">
              <span className="relative z-10 flex items-center gap-2">
                Start Free Trial
                <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-zinc-400 hover:text-white"
          >
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden overflow-hidden bg-zinc-950 border-b border-white/5"
            >
              <div className="flex flex-col p-6 gap-4">
                <a href="#features" className="text-zinc-400 hover:text-white">Features</a>
                <a href="#pricing" className="text-zinc-400 hover:text-white">Pricing</a>
                <a href="#testimonials" className="text-zinc-400 hover:text-white">Testimonials</a>
                <hr className="border-white/5" />
                <Link to="/login" className="text-left text-zinc-300 hover:text-white">Login</Link>
                <Link to="/signup" className="w-full py-3 rounded-xl bg-linear-to-r from-violet-600 to-cyan-500 font-semibold text-white text-center">
                  Start Free Trial
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-violet-600/20 blur-[120px] rounded-full opacity-50 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-cyan-500/10 blur-[100px] rounded-full opacity-30 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-violet-300 mb-6"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
              </span>
              Now connecting with TikTok & Threads
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-5xl md:text-7xl font-bold tracking-tight mb-8"
            >
              All your socials. {' '}
                <span className="text-transparent bg-clip-text bg-linear-to-r from-violet-400 via-fuchsia-400 to-cyan-400">
                One Command Center.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg md:text-xl text-zinc-400 mb-10 max-w-2xl leading-relaxed"
            >
              The unified dashboard for serious creators. Manage Twitter, Instagram, LinkedIn, and TikTok without the tab fatigue.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center gap-4"
            >
              <button className="w-full sm:w-auto px-8 py-4 rounded-full bg-white text-zinc-950 font-bold hover:bg-zinc-200 transition-colors active:scale-95 shadow-[0_0_30px_-5px_rgba(255,255,255,0.3)]">
                Get Started Free
              </button>
              <button className="w-full sm:w-auto px-8 py-4 rounded-full bg-white/5 border border-white/10 text-white font-semibold hover:bg-white/10 transition-colors active:scale-95 flex items-center justify-center gap-2">
                <Play className="size-4 fill-white" />
                Watch Demo
              </button>
            </motion.div>
          </div>

          {/* Floating Icons Animation */}
          <div className="relative h-64 mt-20 w-full max-w-2xl mx-auto perspective-1000">
             <motion.div
               animate={{ y: [0, -10, 0] }}
               transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
               className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
             >
                <div className="size-24 rounded-2xl bg-linear-to-br from-zinc-800 to-zinc-900 border border-white/10 shadow-2xl flex items-center justify-center">
                   <Sparkles className="size-10 text-white" />
                </div>
             </motion.div>

             <SocialIcon Icon={Twitter} color="bg-sky-500" className="top-0 left-20" delay={0} />
             <SocialIcon Icon={Instagram} color="bg-pink-500" className="bottom-0 left-10" delay={1.5} />
             <SocialIcon Icon={Linkedin} color="bg-blue-600" className="top-10 right-20" delay={0.8} />
             <SocialIcon Icon={Music2} color="bg-black border border-white/20" className="bottom-10 right-10" delay={2.2} />
          </div>
        </div>
      </section>

      {/* Social Proof Marquee */}
      <section className="py-10 border-y border-white/5 bg-white/2 overflow-hidden">
         <div className="flex gap-16 animate-marquee whitespace-nowrap mask-linear-fade">
             {[...Array(2)].map((_, i) => (
                <div key={i} className="flex gap-16 items-center opacity-50">
                  <span className="text-xl font-bold font-serif">ACME Corp</span>
                  <span className="text-xl font-bold tracking-widest">LAYER</span>
                  <span className="text-xl font-bold italic">Sisyphus</span>
                  <span className="text-xl font-bold">Circool</span>
                  <span className="text-xl font-bold font-mono">Catalog</span>
                  <span className="text-xl font-bold font-serif">Quotient</span>
                </div>
             ))}
         </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 md:py-32 relative">
        <div className="max-w-7xl mx-auto px-6">
           <div className="text-center mb-20">
             <h2 className="text-3xl md:text-5xl font-bold mb-6">Everything you need to <br/><span className="text-violet-400">dominate the feed.</span></h2>
             <p className="text-zinc-400 text-lg max-w-2xl mx-auto">Stop switching apps. Start creating. Our powerful suite of tools helps you manage your entire social presence from one dashboard.</p>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FeatureCard 
                 icon={<MessageSquare className="size-6 text-white"/>} 
                 title="Unified Inbox"
                 description="Read and reply to comments from X, Instagram, and LinkedIn in one single stream."
                 className="md:col-span-2"
                 gradient="from-violet-500/20 to-purple-500/20"
              />
              <FeatureCard 
                 icon={<BarChart3 className="size-6 text-white"/>} 
                 title="Deep Analytics"
                 description="Track your growth with consolidated metrics across all platforms."
                 gradient="from-blue-500/20 to-cyan-500/20"
              />
              <FeatureCard 
                 icon={<Sparkles className="size-6 text-white"/>} 
                 title="AI Content Scheduler"
                 description="Let AI generate captions and schedule posts for peak engagement times."
                 gradient="from-emerald-500/20 to-teal-500/20"
              />
              <FeatureCard 
                 icon={<ArrowRight className="size-6 text-white"/>} 
                 title="Workflow Automation"
                 description="Automate repetitive tasks and save hours every week."
                 className="md:col-span-2"
                 gradient="from-orange-500/20 to-red-500/20"
              />
           </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl md:text-6xl font-bold mb-8">Ready to take control?</h2>
          <p className="text-xl text-zinc-400 mb-10">Join 10,000+ creators who trust SocialNexus.</p>
          <button className="px-10 py-5 rounded-full bg-linear-to-r from-violet-600 to-cyan-500 text-lg font-bold text-white shadow-xl shadow-violet-500/30 hover:scale-105 transition-transform">
             Start Your Free Trial
          </button>
        </div>
        
        {/* Glow effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-3xl bg-violet-600/20 blur-[130px] rounded-full -z-10" />
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-zinc-950 py-12 md:py-20">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12 text-sm">
           <div className="space-y-4">
             <div className="flex items-center gap-2">
               <Sparkles className="size-5 text-violet-500" />
               <span className="font-bold text-lg">SocialNexus</span>
             </div>
             <p className="text-zinc-500">The last social media tool you'll ever need.</p>
           </div>
           
           <div>
             <h4 className="font-bold text-white mb-4">Product</h4>
             <ul className="space-y-2 text-zinc-500">
               <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
               <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
               <li><a href="#" className="hover:text-white transition-colors">Integration</a></li>
             </ul>
           </div>

           <div>
             <h4 className="font-bold text-white mb-4">Company</h4>
             <ul className="space-y-2 text-zinc-500">
               <li><a href="#" className="hover:text-white transition-colors">About</a></li>
               <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
               <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
               <li><Link to="/data-deletion" className="hover:text-white transition-colors">Data Deletion</Link></li>
             </ul>
           </div>

           <div>
             <h4 className="font-bold text-white mb-4">Subscribe</h4>
             <form className="flex gap-2">
               <input 
                 type="email" 
                 placeholder="Enter your email" 
                 className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 w-full"
               />
               <button className="bg-white text-zinc-950 px-3 py-2 rounded-lg font-medium hover:bg-zinc-200">
                 Join
               </button>
             </form>
           </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-12 pt-8 border-t border-white/5 text-center text-zinc-600 text-xs">
          © {new Date().getFullYear()} SocialNexus Inc. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

function SocialIcon({ Icon, color, className, delay }: { Icon: React.ElementType, color: string, className?: string, delay: number }) {
  return (
    <motion.div
      animate={{ y: [0, -15, 0] }}
      transition={{ duration: 3, delay: delay, repeat: Infinity, ease: "easeInOut" }}
      className={cn("absolute p-3 rounded-xl shadow-lg z-10", color, className)}
    >
      <Icon className="size-6 text-white" />
    </motion.div>
  );
}

function FeatureCard({ icon, title, description, className, gradient }: { icon: React.ReactNode, title: string, description: string, className?: string, gradient: string }) {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className={cn("group p-8 rounded-3xl bg-zinc-900/50 border border-white/5 hover:border-white/10 transition-colors relative overflow-hidden", className)}
    >
       <div className={cn("absolute inset-0 bg-linear-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500", gradient)} />
       <div className="relative z-10">
         <div className="size-12 rounded-xl bg-zinc-800 flex items-center justify-center mb-6 border border-white/5 group-hover:scale-110 transition-transform duration-300">
           {icon}
         </div>
         <h3 className="text-xl font-bold mb-3">{title}</h3>
         <p className="text-zinc-400 group-hover:text-zinc-300 transition-colors">{description}</p>
       </div>
    </motion.div>
  );
}
