# Publishing Workaround

The Bolt "Publish Output" terminal has a UI issue, but **your app builds successfully!**

## Verified Build Status
✅ Build completes in ~16 seconds
✅ Output: 1.3MB in `/dist` folder
✅ All files generated correctly

## Deployment Options

### Option 1: Use Bolt's Publish Button
Even though you can't see the output terminal, the publish button should still work. Click "Publish" and wait for the deployment URL.

### Option 2: Manual Deploy to Netlify

1. **Download your project** from Bolt (use the download button)

2. **Deploy via Netlify CLI:**
   ```bash
   npm install -g netlify-cli
   cd your-project-folder
   npm install
   npm run build
   netlify deploy --prod
   ```

3. **Or drag-and-drop:**
   - Run `npm run build` locally
   - Go to https://app.netlify.com/drop
   - Drag the `dist/` folder onto the page

### Option 3: Manual Deploy to Vercel

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   cd your-project-folder
   vercel --prod
   ```

2. **Or use Vercel Dashboard:**
   - Push code to GitHub
   - Import repository at https://vercel.com/new
   - Vercel auto-detects Vite settings from `vercel.json`

## Environment Variables Required

After deployment, add these environment variables in your hosting platform:

```
VITE_SUPABASE_URL=https://jjrfayfncwljjcdwumho.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

Also configure these in Supabase Edge Function secrets:
- `IG_ACCESS_TOKEN` - Instagram API token
- `IG_ID` - Instagram Business Account ID
- `FB_ACCESS_TOKEN` - Facebook Page token
- `FB_PAGE_ID` - Facebook Page ID

## Build Details
- Framework: Vite + React
- Output: `dist/` folder
- SPA routing: Configured for both Netlify and Vercel
