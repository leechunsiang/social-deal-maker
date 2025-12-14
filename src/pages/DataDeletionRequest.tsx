import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function DataDeletionRequest() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-violet-500/30 flex flex-col items-center justify-center p-6">
      <Link to="/" className="absolute top-6 left-6 text-zinc-400 hover:text-white flex items-center gap-2 transition-colors">
        <ArrowLeft className="size-4" />
        Back to Home
      </Link>
      <div className="max-w-md text-center space-y-6">
        <h1 className="text-3xl font-bold">Data Deletion Request</h1>
        <p className="text-zinc-400 text-lg">
          Contact us to request data deletion
        </p>
        <a href="mailto:support@socialdealmaker.com" className="inline-block px-6 py-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-violet-300 font-medium">
          support@socialdealmaker.com
        </a>
      </div>
    </div>
  );
}
