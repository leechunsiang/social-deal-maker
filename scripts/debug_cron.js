import { createClient } from '@supabase/supabase-js';

const url = 'https://jjrfayfncwljjcdwumho.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqcmZheWZuY3dsampjZHd1bWhvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTgxMDQzNSwiZXhwIjoyMDgxMzg2NDM1fQ.04SdLadbZWqrLg3AJXAGwosmTsLhi5q_mkcsdujcHvA';

const supabase = createClient(url, key, {
  db: { schema: 'net' }
});

async function checkCronLogs() {
    console.log('Checking pg_net response logs...');
    
    // Attempt to query net.http_response
    // content can be text/json?
    const { data, error } = await supabase
        .from('http_request_queue')
        .select('*')
        .order('created', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error querying queue:', error);
    } else {
        console.log('Recent Requests:', JSON.stringify(data, null, 2));
    }
}

checkCronLogs();
