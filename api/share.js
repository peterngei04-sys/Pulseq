// api/share.js
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).send('Post ID is required');
  }

  // Initialize Supabase (Vercel will pull these from your Env Variables)
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY 
  );

  // Fetch the post data
  const { data: post, error } = await supabase
    .from('posts')
    .select('title, body, image_url')
    .eq('id', id)
    .single();

  const title = post?.title || "PulseQ";
  const description = post?.body?.substring(0, 150) || "Check out this post on PulseQ";
  const image = post?.image_url || "https://pulseq-blue.vercel.app/logo.png";
  const appUrl = `https://pulseq-blue.vercel.app/post/${id}`;

  // Set the Content-Type to HTML so the social bots can read it
  res.setHeader('Content-Type', 'text/html');

  return res.status(200).send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <meta property="og:title" content="${title}" />
        <meta property="og:description" content="${description}" />
        <meta property="og:image" content="${image}" />
        <meta property="og:url" content="${appUrl}" />
        <meta property="og:type" content="article" />
        <meta name="twitter:card" content="summary_large_image" />
        
        <script>window.location.href = "${appUrl}";</script>
      </head>
      <body>
        Redirecting to PulseQ...
      </body>
    </html>
  `);
}
