-- Create messenger_leads table to store users who message the page
CREATE TABLE IF NOT EXISTS public.messenger_leads (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    psid text UNIQUE NOT NULL, -- Page Scoped ID from Messenger
    first_name text,
    last_name text,
    profile_pic text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create messenger_messages table to store conversation history
CREATE TABLE IF NOT EXISTS public.messenger_messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id uuid REFERENCES public.messenger_leads(id) ON DELETE CASCADE NOT NULL,
    message_id text UNIQUE NOT NULL,
    content text,
    type text NOT NULL DEFAULT 'text', -- text, image, audio, video, file, etc.
    direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    created_at timestamptz NOT NULL, -- Message timestamp from Facebook
    received_at timestamptz DEFAULT now() -- When we processed it
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_messenger_leads_psid ON public.messenger_leads(psid);
CREATE INDEX IF NOT EXISTS idx_messenger_messages_lead_id ON public.messenger_messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_messenger_messages_created_at ON public.messenger_messages(created_at);

-- Enable RLS
ALTER TABLE public.messenger_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messenger_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for messenger_leads
-- Service role (Edge Functions) needs full access
CREATE POLICY "Service role can do everything on messenger_leads"
    ON public.messenger_leads
    USING (true)
    WITH CHECK (true);

-- Authenticated users (admin dashboard) can view leads
CREATE POLICY "Authenticated users can view messenger_leads"
    ON public.messenger_leads FOR SELECT
    TO authenticated
    USING (true);

-- Create policies for messenger_messages
-- Service role needs full access
CREATE POLICY "Service role can do everything on messenger_messages"
    ON public.messenger_messages
    USING (true)
    WITH CHECK (true);

-- Authenticated users can view messages
CREATE POLICY "Authenticated users can view messenger_messages"
    ON public.messenger_messages FOR SELECT
    TO authenticated
    USING (true);
