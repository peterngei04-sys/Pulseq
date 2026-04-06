import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  const { id } = req.query;

  const { data: post } = await supabase
    .from("posts")
    .select("title, body, image_url")
    .eq("id", id)
    .single();

  if (!post) {
    return res.status(404).send("Post not found");
  }

const html = `
<!DOCTYPE html>
<html>
<head>
  <title>${post.title}</title>

  <meta property="og:title" content="${post.title}" />
  <meta property="og:description" content="${(post.body || "").slice(0,150)}" />
  <meta property="og:image" content="${post.image_url || "https://your-default-image.com/default.png"}" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${post.title}" />
  <meta name="twitter:description" content="${(post.body || "").slice(0,150)}" />
  <meta name="twitter:image" content="${post.image_url || "https://your-default-image.com/default.png"}" />

  <script>
    setTimeout(() => {
      window.location.href = "/post/${id}";
    }, 1500);
  </script>
</head>

<body style="font-family:sans-serif;text-align:center;padding:40px;">
  <h1>${post.title}</h1>
  <p>${(post.body || "").slice(0,150)}</p>
  <p>Redirecting...</p>
</body>
</html>
`;
  res.setHeader("Content-Type", "text/html");
  res.send(html);
}
