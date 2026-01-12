-- Add messenger tables to the supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE messenger_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE messenger_leads;
