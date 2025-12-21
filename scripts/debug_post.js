import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env file
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL; // Likely named this in vite apps
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY; 

// Try alternative names if not found
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
// FORCE Service Role Key for debugging to bypass RLS
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

console.log('Using Key ending in:', key ? key.slice(-5) : 'None');


console.log('Available Env Vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));


if (!url || !key) {
  console.error('Missing Supabase URL or Key in .env');
  console.log('Available env vars:', Object.keys(process.env));
  process.exit(1);
}

const supabase = createClient(url, key);

async function checkPosts() {
  console.log('Checking scheduled posts...');
  const now = new Date().toISOString();
  console.log(`Current Time (ISO): ${now}`);

  const { data: posts, error } = await supabase
    .from('scheduled_posts')
    .select('*');

  if (error) {
    console.error('Error fetching posts:', error);
    return;
  }

  console.log(`Found ${posts.length} total posts.`);
  
  const relevantPosts = posts.filter(p => p.status === 'scheduled' || p.status === 'failed');
  console.log(`Found ${relevantPosts.length} relevant posts (scheduled/failed).`);

  relevantPosts.forEach(p => {
    console.log(`--------------------------------------------------`);
    console.log(`ID: ${p.id}`);
    console.log(`Status: ${p.status}`);
    console.log(`Scheduled At: ${p.scheduled_at}`);
    console.log(`Error Message: ${p.error_message || 'N/A'}`);
    console.log(`Details: Type=${p.post_type}, Caption=${p.caption?.substring(0, 20)}...`);
  });

}

checkPosts();
