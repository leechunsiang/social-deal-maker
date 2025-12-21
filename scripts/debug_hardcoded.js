import { createClient } from '@supabase/supabase-js';

const url = 'https://jjrfayfncwljjcdwumho.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqcmZheWZuY3dsampjZHd1bWhvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTgxMDQzNSwiZXhwIjoyMDgxMzg2NDM1fQ.04SdLadbZWqrLg3AJXAGwosmTsLhi5q_mkcsdujcHvA';

const supabase = createClient(url, key);

async function run() {
    console.log('Fetching posts...');
    const { data, error } = await supabase.from('scheduled_posts').select('*');
    if (error) {
        console.error('Error:', error);
    } else {
        console.log(`Found ${data.length} posts.`);
        const failed = data.filter(p => p.status === 'failed').sort((a,b) => a.created_at > b.created_at ? -1 : 1);
        console.log(`Found ${failed.length} FAILED posts.`);
        
        if (failed.length > 0) {
            const p = failed[0];
            console.log('MOST RECENT FAILED POST:');
            console.log('ID:', p.id);
            
            const payload = {
                media_urls: p.media_urls,
                media_url: p.media_url,
                caption: p.caption,
                post_type: p.post_type
            };

            console.log('Executing Fetch Request...');
            
            try {
                const res = await fetch('https://jjrfayfncwljjcdwumho.supabase.co/functions/v1/publish-instagram-post', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${key}`
                    },
                    body: JSON.stringify(payload)
                });
                
                const text = await res.text();
                console.log('Response Status:', res.status);
                console.log('Response Body:', text);
            } catch (err) {
                console.error('Fetch Failed:', err);
            }

        }



    }

}

run();
