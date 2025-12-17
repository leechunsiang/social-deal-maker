import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-zinc-950 py-12 md:py-20">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12 text-sm">
         <div className="space-y-4">
           <div className="flex items-center gap-2">
             <Sparkles className="size-5 text-violet-500" />
             <span className="font-bold text-lg text-white">SocialNexus</span>
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
  );
}
