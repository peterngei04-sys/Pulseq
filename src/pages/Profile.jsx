import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/globale.css";
import "../styles/profile.css";

export default function Profile() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [activeTab, setActiveTab] = useState("posts");
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  /* -------------------------
  Load profile and counts
  ------------------------- */
  const loadProfile = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      const { data: profileData } = await supabase
        .from("profiles").select("*").eq("id", id).single();

      if (!profileData) { setProfile(null); setLoading(false); return; }
      setProfile(profileData);

      const { count: followers } = await supabase
        .from("follows").select("*", { count: "exact", head: true }).eq("following_id", id);
      setFollowersCount(followers || 0);

      const { count: following } = await supabase
        .from("follows").select("*", { count: "exact", head: true }).eq("follower_id", id);
      setFollowingCount(following || 0);

      if (user && user.id !== id) {
        const { data: followData } = await supabase
          .from("follows").select("*").eq("follower_id", user.id).eq("following_id", id).single();
        setIsFollowing(!!followData);
      }

      loadTabPosts(activeTab);
    } catch (err) {
      console.log("Error loading profile:", err.message);
    }
    setLoading(false);
  };

  useEffect(() => { loadProfile(); }, [id]);
  useEffect(() => { loadTabPosts(activeTab); }, [activeTab]);

  /* -------------------------
  Load posts by tab
  ------------------------- */
  const loadTabPosts = async (tab) => {
    try {
      let data;

      if (tab === "posts") {
        const res = await supabase
          .from("posts")
          .select("*, votes(id), comments(id), favorites(id), reposts(id)")
          .eq("user_id", id)
          .order("created_at", { ascending: false });
        data = (res.data || []).map(p => ({
          ...p,
          upvotes_count: p.votes?.length || 0,
          comments_count: p.comments?.length || 0,
          fav_count: p.favorites?.length || 0,
          repost_count: p.reposts?.length || 0,
        }));

      } else if (tab === "liked") {
        const res = await supabase
          .from("votes")
          .select("posts(*, votes(id), comments(id), favorites(id), reposts(id))")
          .eq("user_id", id)
          .order("created_at", { ascending: false });
        data = (res.data || [])
          .filter(d => d.posts)
          .map(d => ({
            ...d.posts,
            upvotes_count: d.posts.votes?.length || 0,
            comments_count: d.posts.comments?.length || 0,
            fav_count: d.posts.favorites?.length || 0,
            repost_count: d.posts.reposts?.length || 0,
          }));

      } else if (tab === "favorites") {
        const res = await supabase
          .from("favorites")
          .select("posts(*, votes(id), comments(id), favorites(id), reposts(id))")
          .eq("user_id", id)
          .order("created_at", { ascending: false });
        data = (res.data || [])
          .filter(d => d.posts)
          .map(d => ({
            ...d.posts,
            upvotes_count: d.posts.votes?.length || 0,
            comments_count: d.posts.comments?.length || 0,
            fav_count: d.posts.favorites?.length || 0,
            repost_count: d.posts.reposts?.length || 0,
          }));

      } else if (tab === "reposts") {
        const res = await supabase
          .from("reposts")
          .select("posts(*, votes(id), comments(id), favorites(id), reposts(id))")
          .eq("user_id", id)
          .order("created_at", { ascending: false });
        data = (res.data || [])
          .filter(d => d.posts)
          .map(d => ({
            ...d.posts,
            upvotes_count: d.posts.votes?.length || 0,
            comments_count: d.posts.comments?.length || 0,
            fav_count: d.posts.favorites?.length || 0,
            repost_count: d.posts.reposts?.length || 0,
          }));
      }

      setPosts(data || []);
    } catch (e) {
      console.log(e);
      setPosts([]);
    }
  };

  /* -------------------------
  Follow / Unfollow
  ------------------------- */
  const toggleFollow = async () => {
    if (!currentUser || currentUser.id === id) return;
    if (isFollowing) {
      await supabase.from("follows").delete().eq("follower_id", currentUser.id).eq("following_id", id);
      setFollowersCount(prev => prev - 1);
    } else {
      await supabase.from("follows").insert({ follower_id: currentUser.id, following_id: id });
      await supabase.from("notifications").insert({
        user_id: id, actor_id: currentUser.id, type: "follow", message: "started following you"
      });
      setFollowersCount(prev => prev + 1);
    }
    setIsFollowing(!isFollowing);
  };

  /* -------------------------
  Vote
  ------------------------- */
  const handleVote = async (postId) => {
    if (!currentUser) return;
    const { data: existing } = await supabase
      .from("votes").select("id").eq("post_id", postId).eq("user_id", currentUser.id).single();
    if (existing) {
      await supabase.from("votes").delete().eq("post_id", postId).eq("user_id", currentUser.id);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, upvotes_count: Math.max((p.upvotes_count || 1) - 1, 0) } : p));
    } else {
      await supabase.from("votes").insert({ post_id: postId, user_id: currentUser.id });
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, upvotes_count: (p.upvotes_count || 0) + 1 } : p));
      const postOwner = posts.find(p => p.id === postId)?.user_id;
      if (postOwner && postOwner !== currentUser.id) {
        await supabase.from("notifications").insert({
          user_id: postOwner, actor_id: currentUser.id, post_id: postId,
          type: "vote", message: "upvoted your post"
        });
      }
    }
  };

  if (loading) return <div className="profile-loading">Loading...</div>;
  if (!profile) return <div className="profile-loading">Profile not found</div>;

  const tabs = ["posts", "liked", "favorites", "reposts"];
  const isOwn = currentUser && currentUser.id === id;

  return (
    <div className="profile-page">

      {/* ---- COVER + AVATAR (X / Facebook hybrid) ---- */}
      <div className="profile-cover">
        <div className="profile-cover-bg" />
        {/* Small round avatar on left like X */}
        <div className="profile-avatar-small">
          {profile.username.charAt(0).toUpperCase()}
        </div>
      </div>

      {/* ---- HEADER INFO ---- */}
      <div className="profile-header">
        <div className="profile-header-right">
          {!isOwn && currentUser && (
            <button
              className={"follow-btn" + (isFollowing ? " following" : "")}
              onClick={toggleFollow}
            >
              {isFollowing ? "Following" : "Follow"}
            </button>
          )}
        </div>

        <h2 className="profile-username">{profile.username}</h2>
        <p className="profile-bio">{profile.bio || "No bio yet"}</p>

        {/* TikTok-style stats */}
        <div className="profile-stats">
          <div className="stat-item">
            <span className="stat-num">{followingCount}</span>
            <span className="stat-label">Following</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-num">{followersCount}</span>
            <span className="stat-label">Followers</span>
          </div>
        </div>

        {/* TABS */}
        <div className="profile-tabs">
          {tabs.map(tab => (
            <div
              key={tab}
              className={"tab" + (activeTab === tab ? " active" : "")}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "liked" ? "❤️" : tab === "favorites" ? "⭐" : tab === "reposts" ? "🔄" : "📝"}
              <span>{tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ---- POSTS ---- */}
      <div className="profile-posts">
        {posts.length === 0 ? (
          <div className="profile-empty">
            <div style={{ fontSize: "32px", marginBottom: "10px" }}>
              {activeTab === "favorites" ? "⭐" : activeTab === "reposts" ? "🔄" : activeTab === "liked" ? "❤️" : "📝"}
            </div>
            <p>
              {activeTab === "posts" && "No posts yet"}
              {activeTab === "liked" && "No liked posts yet"}
              {activeTab === "favorites" && "No favorites yet"}
              {activeTab === "reposts" && "No reposts yet"}
            </p>
          </div>
        ) : (
          posts.map(p => (
            <div key={p.id} className="profile-post-card" onClick={() => navigate("/post/" + p.id)}>
              {p.image_url && (
                <img src={p.image_url} alt="Post" className="profile-post-img" />
              )}
              <h3>{p.title}</h3>
              <p>{p.body}</p>
              <div className="post-meta">
                <button onClick={e => { e.stopPropagation(); handleVote(p.id); }}>
                  🔥 {p.upvotes_count || 0}
                </button>
                <span>💬 {p.comments_count || 0}</span>
                <span>⭐ {p.fav_count || 0}</span>
                <span>🔄 {p.repost_count || 0}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

