// src/components/PostCard.jsx
import React from 'react';

export default function PostCard({ post }) {
  return (
    <div className="post-card">
      <h3>{post.title}</h3>
      <p>{post.body}</p>
      {post.image_url && (
        <img src={post.image_url} alt="Post" className="post-image" />
      )}
    </div>
  );
}
