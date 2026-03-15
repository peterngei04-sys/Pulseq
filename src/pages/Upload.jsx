import React from "react";

export default function Upload({ session }) {
  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>Upload Media</h1>
      {session ? (
        <p>Upload images/videos here (paid feature coming soon!)</p>
      ) : (
        <p>Please log in to upload media.</p>
      )}
    </div>
  );
}
