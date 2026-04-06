// src/components/CreatePost.jsx
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { compressAndUpload } from '../utils/imageUpload';

export default function CreatePost() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);

  // Submit post
  const handlePost = async () => {
    if (!title && !body && !selectedFile) {
      alert('Add a title, body, or image before posting.');
      return;
    }

    setLoading(true);
    let imageUrl = null;

    if (selectedFile) {
      imageUrl = await compressAndUpload(selectedFile);
      if (!imageUrl) {
        alert('Image upload failed.');
        setLoading(false);
        return;
      }
    }

    const { data, error } = await supabase.from('posts').insert([{
      title,
      body,
      user_id: supabase.auth.user().id,
      image_url: imageUrl
    }]);

    if (error) {
      console.log('Error creating post:', error);
      alert('Failed to create post');
    } else {
      console.log('Post created!', data);
      setTitle('');
      setBody('');
      setSelectedFile(null);
    }
    setLoading(false);
  };

  return (
    <div className="create-post">
      <input
        type="text"
        placeholder="Title"
        value={title}
        onChange={e => setTitle(e.target.value)}
      />
      <textarea
        placeholder="Body"
        value={body}
        onChange={e => setBody(e.target.value)}
      />
      <input
        type="file"
        accept="image/*"
        onChange={e => setSelectedFile(e.target.files[0])}
      />
      {selectedFile && (
        <img
          src={URL.createObjectURL(selectedFile)}
          alt="Preview"
          className="post-image-preview"
        />
      )}
      <button onClick={handlePost} disabled={loading}>
        {loading ? 'Posting...' : 'Post'}
      </button>
    </div>
  );
}
