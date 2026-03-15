// src/pages/Ask.jsx
import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

export default function Ask({ session }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const navigate = useNavigate();

  const handlePost = async (e) => {
    e.preventDefault();
    if (!session) return alert("Login to post!");

    const { data, error } = await supabase.from("posts").insert([
      { user_id: session.user.id, title, body, post_type: "hot_take" }
    ]);

    if (error) alert(error.message);
    else navigate("/feed");
  };

  return (
    <div style={{ maxWidth: "400px", margin: "50px auto", textAlign: "center" }}>
      <h2>Create a Post</h2>
      <form onSubmit={handlePost}>
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <textarea
          placeholder="Body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          style={{ width: "100%", height: "100px", marginTop: "10px", padding: "10px" }}
        />
        <button type="submit" style={{ marginTop: "10px" }}>Post</button>
      </form>
    </div>
  );
}
