import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  const { id } = req.query;

  const { data: post, error } = await supabase
    .from("posts")
    .select("title, body, image_url")
    .eq("id", id)
    .single();

  if (error || !post) {
    console.error(error);
    return res.status(404).send("Post not found");
  }

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>${post.title}</title>

    <!-- Open Graph -->
    <meta property="og:title" content="${post.title}" />
    <meta property="og:description" content="${post.body.slice(0, 150)}" />
    <meta property="og:image" content="${post.image_url || "https://your-default-image.com/default.png"}" />
    <meta property="og:url" content="https://yourdomain.com/post/${id}" />
    <meta property="og:type" content="article" />

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${post.title}" />
    <meta name="twitter:description" content="${post.body.slice(0, 150)}" />
    <meta name="twitter:image" content="${post.image_url || "https://your-default-image.com/default.png"}" />

    <script>
      window.location.href = "/post/${id}";
    </script>
  </head>
  <body>
    Redirecting...
  </body>
  </html>
  `;

  res.setHeader("Content-Type", "text/html");
  res.send(html);
}
