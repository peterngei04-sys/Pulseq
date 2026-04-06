import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import "../styles/globale.css";
import "../styles/feed.css";
import { uploadImage } from "../utils/imageUpload";

export default function Feed() {

const navigate = useNavigate();

const [session, setSession] = useState(null);
const [profile, setProfile] = useState(null);

const [posts, setPosts] = useState([]);
const [loading, setLoading] = useState(true);

const [showModal, setShowModal] = useState(false);

/* ---- POST DETAIL ---- */
const [detailPost, setDetailPost] = useState(null);
const [detailComments, setDetailComments] = useState([]);
const [detailLoading, setDetailLoading] = useState(false);

const [newComment, setNewComment] = useState("");
const [replyTo, setReplyTo] = useState(null);
const [replyText, setReplyText] = useState("");

const [newTitle, setNewTitle] = useState("");
const [newBody, setNewBody] = useState("");

/* ---- IMAGE STATE ---- */
const [newImage, setNewImage] = useState(null);
const [imagePreview, setImagePreview] = useState(null);
const [uploading, setUploading] = useState(false);
const imageInputRef = useRef(null);

/* ---- FEED TABS ---- */
const [activeTab, setActiveTab] = useState("fyp");

/* ---- USER INTERACTIONS — track per post ---- */
const [userFavorites, setUserFavorites] = useState(new Set());
const [userReposts, setUserReposts] = useState(new Set());

const [search, setSearch] = useState("");
const [toast, setToast] = useState(null);
const [isGuest, setIsGuest] = useState(false);


/* ===============================
TIME AGO
================================ */
const timeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  let interval = seconds / 3600;
  if (interval > 24) return Math.floor(interval / 24) + "d ago";
  if (interval > 1) return Math.floor(interval) + "h ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + "m ago";
  return Math.floor(seconds) + "s ago";
};

/* ===============================
TOAST
================================ */
const showToast = (msg) => {
  setToast(msg);
  setTimeout(() => setToast(null), 3000);
};

/* ===============================
IMAGE COMPRESSION
================================ */
const compressImage = (file, maxKB = 100) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        const MAX_DIM = 1200;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) { height = Math.round((height * MAX_DIM) / width); width = MAX_DIM; }
          else { width = Math.round((width * MAX_DIM) / height); height = MAX_DIM; }
        }
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        let quality = 0.9;
        const tryCompress = () => {
          canvas.toBlob((blob) => {
            if (blob.size <= maxKB * 1024 || quality <= 0.1) {
              resolve(new File([blob], file.name, { type: "image/jpeg", lastModified: Date.now() }));
            } else { quality -= 0.1; tryCompress(); }
          }, "image/jpeg", quality);
        };
        tryCompress();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};

/* ===============================
HANDLE IMAGE PICK
================================ */
const handleImagePick = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) { showToast("Please select an image file"); return; }
  showToast("Compressing image...");
  const compressed = await compressImage(file, 100);
  const reader = new FileReader();
  reader.onload = (ev) => setImagePreview(ev.target.result);
  reader.readAsDataURL(compressed);
  setNewImage(compressed);
  showToast("Image ready · " + Math.round(compressed.size / 1024) + " KB");
};

const clearImage = () => {
  setNewImage(null);
  setImagePreview(null);
  if (imageInputRef.current) imageInputRef.current.value = "";
};

/* ===============================
LOAD SESSION
================================ */
useEffect(() => {
  const loadSession = async () => {
    const guest = localStorage.getItem("guest") === "true";
    if (guest) { setIsGuest(true); return; }
    const { data } = await supabase.auth.getSession();
    const sess = data.session;
    setSession(sess);
    if (sess) {
      const { data: profileData } = await supabase
        .from("profiles").select("username").eq("id", sess.user.id).single();
      setProfile(profileData);
      /* load user's existing favorites & reposts for UI state */
      loadUserInteractions(sess.user.id);
    }
  };
  loadSession();
}, []);

/* ===============================
LOAD USER FAVORITES & REPOSTS
================================ */
const loadUserInteractions = async (userId) => {
  const [favRes, repostRes] = await Promise.all([
    supabase.from("favorites").select("post_id").eq("user_id", userId),
    supabase.from("reposts").select("post_id").eq("user_id", userId),
  ]);
  if (favRes.data) setUserFavorites(new Set(favRes.data.map(f => f.post_id)));
  if (repostRes.data) setUserReposts(new Set(repostRes.data.map(r => r.post_id)));
};

/* ===============================
FETCH POSTS — all tabs
================================ */
const fetchPosts = async () => {
  setLoading(true);

  if (activeTab === "fyp") {
    /* All posts ranked by score */
    const { data, error } = await supabase
      .from("posts")
      .select(`
        id, title, body, image_url, created_at, user_id,
        profiles(username),
        votes(count),
        comments(count),
        favorites(count),
        reposts(count)
      `);
    if (error) { console.log(error); setLoading(false); return; }
    const formatted = data.map(p => formatPost(p));
    formatted.sort((a, b) => b.score !== a.score ? b.score - a.score : new Date(b.created_at) - new Date(a.created_at));
    setPosts(formatted);

  } else if (activeTab === "following") {
    /* Posts by people this user follows */
    if (!session) { setPosts([]); setLoading(false); return; }
    const { data: followData } = await supabase
      .from("follows").select("following_id").eq("follower_id", session.user.id);
    if (!followData || followData.length === 0) { setPosts([]); setLoading(false); return; }
    const followingIds = followData.map(f => f.following_id);
    const { data, error } = await supabase
      .from("posts")
      .select(`
        id, title, body, image_url, created_at, user_id,
        profiles(username),
        votes(count),
        comments(count),
        favorites(count),
        reposts(count)
      `)
      .in("user_id", followingIds)
      .order("created_at", { ascending: false });
    if (error) { console.log(error); setLoading(false); return; }
    setPosts((data || []).map(p => formatPost(p)));

  } else if (activeTab === "friends") {
    /* Posts by mutual follows (friends) */
    if (!session) { setPosts([]); setLoading(false); return; }
    /* Get people this user follows */
    const { data: iFollow } = await supabase
      .from("follows").select("following_id").eq("follower_id", session.user.id);
    if (!iFollow || iFollow.length === 0) { setPosts([]); setLoading(false); return; }
    const iFollowIds = iFollow.map(f => f.following_id);
    /* Of those, who follows back? */
    const { data: theyFollow } = await supabase
      .from("follows").select("follower_id")
      .in("follower_id", iFollowIds)
      .eq("following_id", session.user.id);
    if (!theyFollow || theyFollow.length === 0) { setPosts([]); setLoading(false); return; }
    const friendIds = theyFollow.map(f => f.follower_id);
    const { data, error } = await supabase
      .from("posts")
      .select(`
        id, title, body, image_url, created_at, user_id,
        profiles(username),
        votes(count),
        comments(count),
        favorites(count),
        reposts(count)
      `)
      .in("user_id", friendIds)
      .order("created_at", { ascending: false });
    if (error) { console.log(error); setLoading(false); return; }
    setPosts((data || []).map(p => formatPost(p)));
  }

  setLoading(false);
};

const formatPost = (p) => {
  const upvotes = p.votes[0]?.count || 0;
  const commentCount = p.comments[0]?.count || 0;
  const favCount = p.favorites[0]?.count || 0;
  const repostCount = p.reposts[0]?.count || 0;
  const hoursAgo = (Math.floor((Date.now() - new Date(p.created_at)) / 1000) / 3600) + 2;
  const score = (upvotes + commentCount + 2) / hoursAgo;
  return {
    ...p,
    username: p.profiles?.username || "User",
    upvotes,
    comment_count: commentCount,
    fav_count: favCount,
    repost_count: repostCount,
    score
  };
};

/* Reload when tab changes */
useEffect(() => { fetchPosts(); }, [activeTab]);

/* ===============================
LOGOUT
================================ */
const handleLogout = async () => {
  localStorage.removeItem("guest");
  await supabase.auth.signOut();
  navigate("/login");
};

/* ===============================
CREATE POST
================================ */
const handleCreatePost = async (e) => {
  e.preventDefault();
  if (!session) { showToast("Please log in to post"); navigate("/signup"); return; }
  if (!newTitle.trim() || !newBody.trim()) { showToast("Title and body are required"); return; }
  setUploading(true);
  let image_url = null;
  if (newImage) {
    showToast("Uploading image...");
    image_url = await uploadImage(newImage);
    if (!image_url) { showToast("Image upload failed — check bucket policy"); setUploading(false); return; }
  }
  const { error } = await supabase.from("posts")
    .insert({ title: newTitle, body: newBody, image_url, user_id: session.user.id });
  setUploading(false);
  if (error) { console.log("Post insert error:", error); showToast("Error creating post"); return; }
  showToast("Post created!");
  setNewTitle(""); setNewBody("");
  clearImage(); setShowModal(false);
  fetchPosts();
};

/* ===============================
DELETE POST
================================ */
const handleDeletePost = async (postId) => {
  await supabase.from("posts").delete().eq("id", postId);
  showToast("Post deleted");
  if (detailPost && detailPost.id === postId) setDetailPost(null);
  fetchPosts();
};

/* ===============================
VOTE
================================ */
const handleVote = async (postId, e) => {
  if (e) e.stopPropagation();
  if (isGuest) { showToast("Please sign up to vote"); navigate("/signup"); return; }
  if (!session) return;
  const userId = session.user.id;
  const { data: existing } = await supabase
    .from("votes").select("id").eq("post_id", postId).eq("user_id", userId).single();

  const update = (delta) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, upvotes: Math.max((p.upvotes || 0) + delta, 0) } : p));
    if (detailPost && detailPost.id === postId)
      setDetailPost(prev => ({ ...prev, upvotes: Math.max((prev.upvotes || 0) + delta, 0) }));
  };

  if (existing) {
    await supabase.from("votes").delete().eq("post_id", postId).eq("user_id", userId);
    update(-1); showToast("Upvote removed");
  } else {
    await supabase.from("votes").insert({ post_id: postId, user_id: userId });
    update(1);
    const { data: postOwner } = await supabase.from("posts").select("user_id").eq("id", postId).single();
    if (postOwner && postOwner.user_id !== userId) {
      await supabase.from("notifications").insert({
        user_id: postOwner.user_id, actor_id: userId, post_id: postId,
        type: "vote", message: "upvoted your post"
      });
    }
    showToast("Upvoted 🔥");
  }
};

/* ===============================
FAVORITE
================================ */
const handleFavorite = async (postId, e) => {
  if (e) e.stopPropagation();
  if (isGuest) { showToast("Sign up to favorite"); navigate("/signup"); return; }
  if (!session) return;
  const userId = session.user.id;
  const isFaved = userFavorites.has(postId);

  const updateCount = (delta) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, fav_count: Math.max((p.fav_count || 0) + delta, 0) } : p));
    if (detailPost && detailPost.id === postId)
      setDetailPost(prev => ({ ...prev, fav_count: Math.max((prev.fav_count || 0) + delta, 0) }));
  };

  if (isFaved) {
    await supabase.from("favorites").delete().eq("post_id", postId).eq("user_id", userId);
    setUserFavorites(prev => { const s = new Set(prev); s.delete(postId); return s; });
    updateCount(-1); showToast("Removed from favorites");
  } else {
    await supabase.from("favorites").insert({ post_id: postId, user_id: userId });
    setUserFavorites(prev => new Set([...prev, postId]));
    updateCount(1);
    const { data: postOwner } = await supabase.from("posts").select("user_id").eq("id", postId).single();
    if (postOwner && postOwner.user_id !== userId) {
      await supabase.from("notifications").insert({
        user_id: postOwner.user_id, actor_id: userId, post_id: postId,
        type: "favorite", message: "added your post to favorites"
      });
    }
    showToast("Added to favorites ⭐");
  }
};

/* ===============================
REPOST
================================ */
const handleRepost = async (postId, e) => {
  if (e) e.stopPropagation();
  if (isGuest) { showToast("Sign up to repost"); navigate("/signup"); return; }
  if (!session) return;
  const userId = session.user.id;
  const isReposted = userReposts.has(postId);

  const updateCount = (delta) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, repost_count: Math.max((p.repost_count || 0) + delta, 0) } : p));
    if (detailPost && detailPost.id === postId)
      setDetailPost(prev => ({ ...prev, repost_count: Math.max((prev.repost_count || 0) + delta, 0) }));
  };

  if (isReposted) {
    await supabase.from("reposts").delete().eq("post_id", postId).eq("user_id", userId);
    setUserReposts(prev => { const s = new Set(prev); s.delete(postId); return s; });
    updateCount(-1); showToast("Repost removed");
  } else {
    await supabase.from("reposts").insert({ post_id: postId, user_id: userId });
    setUserReposts(prev => new Set([...prev, postId]));
    updateCount(1);
    const { data: postOwner } = await supabase.from("posts").select("user_id").eq("id", postId).single();
    if (postOwner && postOwner.user_id !== userId) {
      await supabase.from("notifications").insert({
        user_id: postOwner.user_id, actor_id: userId, post_id: postId,
        type: "repost", message: "reposted your post"
      });
    }
    showToast("Reposted 🔄");
  }
};

/* ===============================
OPEN / CLOSE POST DETAIL
================================ */
const openPostDetail = async (post) => {
  setDetailPost(post);
  setNewComment(""); setReplyTo(null); setReplyText("");
  setDetailLoading(true);
  const { data } = await supabase
    .from("comments")
    .select("id, content, parent_id, profiles(username)")
    .eq("post_id", post.id)
    .order("created_at", { ascending: true });
  setDetailComments((data || []).map(c => ({ ...c, username: c.profiles?.username || "User" })));
  setDetailLoading(false);
};

const closePostDetail = () => {
  setDetailPost(null); setDetailComments([]);
  setReplyTo(null); setReplyText(""); setNewComment("");
};

const refreshDetailComments = async (postId) => {
  const { data } = await supabase
    .from("comments")
    .select("id, content, parent_id, profiles(username)")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  setDetailComments((data || []).map(c => ({ ...c, username: c.profiles?.username || "User" })));
};

/* ===============================
ADD COMMENT
================================ */
const handleAddComment = async (postId) => {
  if (isGuest) { showToast("Sign up to comment"); navigate("/signup"); return; }
  if (!newComment.trim() || !session) return;
  setPosts(prev => prev.map(p => p.id === postId ? { ...p, comment_count: (p.comment_count || 0) + 1 } : p));
  if (detailPost && detailPost.id === postId)
    setDetailPost(prev => ({ ...prev, comment_count: (prev.comment_count || 0) + 1 }));
  await supabase.from("comments").insert({ post_id: postId, user_id: session.user.id, content: newComment, parent_id: null });
  const { data: postOwner } = await supabase.from("posts").select("user_id").eq("id", postId).single();
  if (postOwner && postOwner.user_id !== session.user.id) {
    await supabase.from("notifications").insert({
      user_id: postOwner.user_id, actor_id: session.user.id, post_id: postId,
      type: "comment", message: "commented on your post"
    });
  }
  setNewComment("");
  await refreshDetailComments(postId);
  showToast("Comment added");
};

/* ===============================
SUBMIT REPLY
================================ */
const submitReply = async (commentId, postId) => {
  if (isGuest) { showToast("Sign up to reply"); navigate("/signup"); return; }
  if (!replyText.trim() || !session) return;
  await supabase.from("comments").insert({
    post_id: postId, user_id: session.user.id, content: replyText, parent_id: commentId
  });
  setReplyText(""); setReplyTo(null);
  await refreshDetailComments(postId);
  const { data: parent } = await supabase.from("comments").select("user_id").eq("id", commentId).single();
  if (parent && parent.user_id !== session.user.id) {
    await supabase.from("notifications").insert({
      user_id: parent.user_id, actor_id: session.user.id, post_id: postId,
      type: "reply", message: "replied to your comment"
    });
  }
  showToast("Reply added");
};

/* ===============================
SHARE POST
================================ */
const handleShare = async (post, e) => {
  if (e) e.stopPropagation();

  // 👇 THIS is the magic change
  const link = window.location.origin + "/api/post/" + post.id;

  const message =
    "Check this out on PulseQ!\n\n\"" +
    post.title +
    "\"\n\n" +
    link;

  try {
    if (navigator.share) {
      await navigator.share({
        title: post.title,
        text: message,
        url: link,
      });
    } else {
      await navigator.clipboard.writeText(link);
      showToast("Share link copied");
    }
  } catch (err) {
    console.log(err);
  }
};
/* ===============================
SEARCH FILTER
================================ */
const filteredPosts = posts.filter(post => {
  const term = search.toLowerCase();
  return (
    post.title?.toLowerCase().includes(term) ||
    post.body?.toLowerCase().includes(term) ||
    post.username?.toLowerCase().includes(term)
  );
});

/* ===============================
RENDER COMMENT TREE
================================ */
const renderComments = (parentId) => {
  return detailComments
    .filter(c => c.parent_id === parentId)
    .map(c => (
      <div key={c.id} className={parentId ? "reply-indent" : ""}>
        <div className="comment-item">
          <div className="comment-avatar">{c.username.charAt(0).toUpperCase()}</div>
          <div style={{ flex: 1 }}>
            <div className="comment-bubble">
              <strong>{c.username}</strong>
              <p>{c.content}</p>
            </div>
            <button className="reply-btn" onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}>
              Reply
            </button>
            {replyTo === c.id && (
              <div className="reply-box">
                <textarea
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder={"Reply to " + c.username + "..."}
                />
                <div className="reply-box-actions">
                  <button onClick={() => submitReply(c.id, detailPost.id)}>Post Reply</button>
                  <button onClick={() => setReplyTo(null)}>Cancel</button>
                </div>
              </div>
            )}
            {renderComments(c.id)}
          </div>
        </div>
      </div>
    ));
};

/* ===============================
ACTION BAR HELPER (reused in card + detail)
================================ */
const ActionBar = ({ post, inDetail = false }) => (
  <div className="card-actions" onClick={e => e.stopPropagation()} style={inDetail ? { marginTop: "10px", padding: "10px 0 0" } : {}}>
    <button className="action-btn" onClick={e => handleVote(post.id, e)}>
      🔥 <span>{post.upvotes || 0}</span>
    </button>
    <button className="action-btn" onClick={e => { e.stopPropagation(); if (!inDetail) openPostDetail(post); }}>
      💬 <span>{post.comment_count || 0}</span>
    </button>
    <button
      className={"action-btn" + (userFavorites.has(post.id) ? " active-fav" : "")}
      onClick={e => handleFavorite(post.id, e)}
      title="Favorite"
    >
      {userFavorites.has(post.id) ? "⭐" : "☆"} <span>{post.fav_count || 0}</span>
    </button>
    <button
      className={"action-btn" + (userReposts.has(post.id) ? " active-repost" : "")}
      onClick={e => handleRepost(post.id, e)}
      title="Repost"
    >
      {userReposts.has(post.id) ? "🔄" : "↺"} <span>{post.repost_count || 0}</span>
    </button>
    <button className="action-btn" onClick={e => handleShare(post, e)}>📤</button>
    {session && session.user.id === post.user_id && (
      <button className="action-btn" onClick={e => { e.stopPropagation(); handleDeletePost(post.id); }}>🗑</button>
    )}
  </div>
);

/* ===============================
UI
================================ */
return (
<div className="feed-wrapper">

  {/* TOP HEADER */}
  <header className="top-header">
    <h2>PulseQ</h2>
    <div>
      <span>Hi, {profile?.username || "Guest"}</span>
      <div className="profile-btn" onClick={() => session && navigate("/profile/" + session.user.id)}>
        {profile?.username ? profile.username.charAt(0).toUpperCase() : "👤"}
      </div>
      <button className="logout-btn" onClick={handleLogout}>Logout</button>
    </div>
  </header>

  {/* FEED TABS */}
  <div className="feed-tabs">
    {["fyp", "following", "friends"].map(tab => (
      <button
        key={tab}
        className={"feed-tab" + (activeTab === tab ? " active" : "")}
        onClick={() => setActiveTab(tab)}
      >
        {tab === "fyp" ? "✦ For You" : tab.charAt(0).toUpperCase() + tab.slice(1)}
      </button>
    ))}
  </div>

  {/* SEARCH */}
  <div className="search-bar">
    <input placeholder="Search posts..." value={search} onChange={e => setSearch(e.target.value)} />
    <button className="refresh-btn" onClick={fetchPosts}>Refresh</button>
  </div>

  {/* POSTS */}
  <div className="posts-area">
    {loading && Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton-card" />)}

    {!loading && filteredPosts.length === 0 && (
      <div className="empty-state">
        <div className="empty-icon">✦</div>
        {activeTab === "fyp" && "No posts yet — be the first!"}
        {activeTab === "following" && "Follow people to see their posts here."}
        {activeTab === "friends" && "No mutual follows yet. When someone follows you back, their posts appear here."}
      </div>
    )}

    {filteredPosts.map(post => (
      <div key={post.id} className="modern-card" onClick={() => openPostDetail(post)}>
        <div className="card-top">
          <div className="avatar" onClick={e => { e.stopPropagation(); navigate("/profile/" + post.user_id); }}>
            {post.username.charAt(0).toUpperCase()}
          </div>
          <span className="username">
            <strong>{post.username}</strong> · {timeAgo(post.created_at)}
          </span>
        </div>
        <h3 className="modern-title">{post.title}</h3>
        <p className="modern-body">{post.body}</p>
        {post.image_url && (
          <div className="post-image-wrapper">
            <img src={post.image_url} alt="Post attachment" className="post-image" loading="lazy" />
          </div>
        )}
        <ActionBar post={post} />
      </div>
    ))}
  </div>

  {/* Kept for compatibility — hidden via CSS */}
  <div className="notification-bell" onClick={() => navigate("/notifications")}>🔔</div>
  <div className="fab" onClick={() => setShowModal(true)}>+</div>

  {/* BOTTOM NAV */}
  <nav className="bottom-nav">
    <button className={"nav-item" + (!detailPost ? " active" : "")} onClick={closePostDetail}>
      <span className="nav-icon">🏠</span>
      <span className="nav-label">Home</span>
    </button>
    <button className="nav-item" onClick={() => navigate("/notifications")}>
      <span className="nav-icon">🔔</span>
      <span className="nav-label">Alerts</span>
    </button>
    <button
      className="nav-item nav-post"
      onClick={() => {
        if (isGuest) { showToast("Sign up to post"); navigate("/signup"); return; }
        setShowModal(true);
      }}
    >+</button>
    <button className="nav-item" onClick={() => session && navigate("/profile/" + session.user.id)}>
      <span className="nav-icon">👤</span>
      <span className="nav-label">Profile</span>
    </button>
  </nav>

  {/* POST DETAIL OVERLAY */}
  {detailPost && (
    <div className="post-detail-overlay">
      <div className="post-detail-container">
        <div className="post-detail-header">
          <button className="post-detail-back" onClick={closePostDetail}>←</button>
          <span className="post-detail-title">Post</span>
        </div>
        <div className="post-detail-scroll">
          <div className="post-detail-body">
            <div className="card-top" style={{ padding: "0 0 10px" }}>
              <div className="avatar" onClick={() => navigate("/profile/" + detailPost.user_id)}>
                {detailPost.username.charAt(0).toUpperCase()}
              </div>
              <span className="username">
                <strong>{detailPost.username}</strong> · {timeAgo(detailPost.created_at)}
              </span>
            </div>
            <h3 className="modern-title" style={{ padding: "0 0 8px" }}>{detailPost.title}</h3>
            <p className="modern-body" style={{ padding: "0 0 10px" }}>{detailPost.body}</p>
            {detailPost.image_url && (
              <div className="post-image-wrapper" style={{ margin: "0 -16px" }}>
                <img src={detailPost.image_url} alt="Post attachment" className="post-image" />
              </div>
            )}
            <ActionBar post={detailPost} inDetail={true} />
          </div>

          <div className="comments-list">
            <p className="comments-section-label">Comments · {detailComments.length}</p>
            {detailLoading && <div style={{ color: "#4a4a6a", fontSize: "13px", padding: "16px 0" }}>Loading...</div>}
            {!detailLoading && detailComments.length === 0 && (
              <div style={{ color: "#4a4a6a", fontSize: "13px", textAlign: "center", padding: "28px 0" }}>
                No comments yet — start the conversation
              </div>
            )}
            {!detailLoading && renderComments(null)}
          </div>
        </div>

        <div className="comment-input-bar">
          <input
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddComment(detailPost.id); } }}
          />
          <button onClick={() => handleAddComment(detailPost.id)}>↑</button>
        </div>
      </div>
    </div>
  )}

  {/* CREATE POST MODAL */}
  {showModal && (
    <div className="modal-overlay" onClick={() => { setShowModal(false); clearImage(); }}>
      <form className="modal-content" onSubmit={handleCreatePost} onClick={e => e.stopPropagation()}>
        <h3>Create Post</h3>
        <input placeholder="Give it a title..." value={newTitle} onChange={e => setNewTitle(e.target.value)} required />
        <textarea placeholder="What's on your mind?" value={newBody} onChange={e => setNewBody(e.target.value)} required />
        <div className="image-picker-row">
          <input ref={imageInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImagePick} />
          <button type="button" className="action-btn" onClick={() => imageInputRef.current && imageInputRef.current.click()}>
            📷 {newImage ? "Change Image" : "Add Image"}
          </button>
          {newImage && (
            <button type="button" className="action-btn" onClick={clearImage} style={{ marginLeft: "8px" }}>
              ✕ Remove
            </button>
          )}
        </div>
        {imagePreview && (
          <div>
            <img src={imagePreview} alt="Preview" style={{ width: "100%", maxHeight: "180px", objectFit: "cover", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.07)" }} />
            <p style={{ fontSize: "11px", color: "#4a4a6a", marginTop: "4px", textAlign: "right" }}>
              {newImage ? Math.round(newImage.size / 1024) + " KB" : ""}
            </p>
          </div>
        )}
        <button type="submit" disabled={uploading}>{uploading ? "Posting..." : "Post"}</button>
        <span className="close-modal" onClick={() => { setShowModal(false); clearImage(); }}>Cancel</span>
      </form>
    </div>
  )}

  {/* TOAST */}
  {toast && <div className="toast">{toast}</div>}

</div>
);
}
