import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '@/lib/utils';

interface AIReplyButtonProps {
  context: string;
  onGenerate: (reply: string) => void;
  platform?: string;
  className?: string;
  tone?: string;
}

export function AIReplyButton({ context, onGenerate, platform, className, tone = 'friendly' }: AIReplyButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!context.trim()) return;

    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('generate-ai-reply', {
        body: {
          context,
          platform,
          tone,
        },
      });

      if (error) {
        throw error;
      }

      if (data?.reply) {
        onGenerate(data.reply);
      }
    } catch (err) {
      console.error('Error generating AI reply:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={handleGenerate}
      disabled={loading || !context.trim()}
      className={cn("text-zinc-400 hover:text-violet-400 hover:bg-violet-400/10", className)}
      title="Generate AI Reply"
    >
      <Sparkles className={cn("size-5", loading && "animate-spin text-violet-500")} />
    </Button>
  );
}
