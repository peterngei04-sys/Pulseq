import React from "react";

export default function CreatePost({ session }) {
  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>Create a Post</h1>
      {session ? (
        <p>You can create a new post here (coming soon!)</p>
      ) : (
        <p>Please log in to post.</p>
      )}
    </div>
  );
}
