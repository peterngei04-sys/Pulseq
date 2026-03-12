import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useParams } from "react-router-dom";
import "../styles/global.css";

export default function Profile() {
  const { id } = useParams();

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [activeTab, setActiveTab] = useState("posts");
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // -------------------------
  // Load profile and counts
  // -------------------------
  const loadProfile = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single();

      if (!profileData) {
        setProfile(null);
        setLoading(false);
        return;
      }

      setProfile(profileData);

      // Recalculate followers/following count from follows table (ensure correct count)
      const { count: followers } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", id);
      setFollowersCount(followers || 0);

      const { count: following } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", id);
      setFollowingCount(following || 0);

      // Check if current user is following this profile
      if (user && user.id !== id) {
        const { data: followData } = await supabase
          .from("follows")
          .select("*")
          .eq("follower_id", user.id)
          .eq("following_id", id)
          .single();

        setIsFollowing(!!followData);
      }

      loadTabPosts(activeTab);
    } catch (err) {
      console.log("Error loading profile:", err.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadProfile();
  }, [id, activeTab]);

  // -------------------------
  // Load posts by tab
  // -------------------------
  const loadTabPosts = async (tab) => {
    try {
      let query;
      switch (tab) {
        case "posts":
          query = supabase
            .from("posts")
            .select(`
              *,
              votes: votes(id),
              comments: comments(id)
            `)
            .eq("user_id", id)
            .order("created_at", { ascending: false });
          break;
        case "liked":
          query = supabase
            .from("votes")
            .select("posts(votes(id), comments(id),*)")
            .eq("user_id", id)
            .order("created_at", { ascending: false });
          break;
        case "favorites":
          query = supabase
            .from("favorites")
            .select("posts(votes(id), comments(id),*)")
            .eq("user_id", id)
            .order("created_at", { ascending: false });
          break;
        case "reposts":
          query = supabase
            .from("reposts")
            .select("posts(votes(id), comments(id),*)")
            .eq("user_id", id)
            .order("created_at", { ascending: false });
          break;
        default:
          query = supabase
            .from("posts")
            .select(`
              *,
              votes: votes(id),
              comments: comments(id)
            `)
            .eq("user_id", id)
            .order("created_at", { ascending: false });
      }

      const { data } = await query;

      let formattedPosts = [];
      if (tab === "liked" || tab === "favorites" || tab === "reposts") {
        formattedPosts = data?.map((d) => ({
          ...d.posts,
          upvotes_count: d.posts.votes?.length || 0,
          comments_count: d.posts.comments?.length || 0,
        })) || [];
      } else {
        formattedPosts = data?.map((p) => ({
          ...p,
          upvotes_count: p.votes?.length || 0,
          comments_count: p.comments?.length || 0,
        })) || [];
      }

      setPosts(formattedPosts);
    } catch {
      setPosts([]);
    }
  };

  // -------------------------
  // Follow/unfollow
  // -------------------------
  const toggleFollow = async () => {
    if (!currentUser || currentUser.id === id) return;

    if (isFollowing) {
      await supabase.from("follows").delete()
        .eq("follower_id", currentUser.id)
        .eq("following_id", id);
      setFollowersCount(prev => prev - 1);
    } else {
      await supabase.from("follows").insert({ follower_id: currentUser.id, following_id: id });

      // notification
      await supabase.from("notifications").insert({
        user_id: id,
        actor_id: currentUser.id,
        type: "follow",
        message: "started following you"
      });

      setFollowersCount(prev => prev + 1);
    }

    setIsFollowing(!isFollowing);
  };

  // -------------------------
  // Handle post like/upvote
  // -------------------------
  const handleVote = async (postId) => {
    if (!currentUser) return;

    // Instant UI update
    setPosts(prev =>
      prev.map(post =>
        post.id === postId
          ? { ...post, upvotes_count: (post.upvotes_count || 0) + 1 }
          : post
      )
    );

    // Insert vote in DB
    await supabase.from("votes").insert({ post_id: postId, user_id: currentUser.id });

    // Notification
    const postOwner = posts.find(p => p.id === postId)?.user_id;
    if (postOwner && postOwner !== currentUser.id) {
      await supabase.from("notifications").insert({
        user_id: postOwner,
        actor_id: currentUser.id,
        post_id: postId,
        type: "upvote",
        message: "upvoted your post"
      });
    }
  };

  if (loading) return <p style={{ textAlign: "center", color: "white" }}>Loading...</p>;
  if (!profile) return <p style={{ textAlign: "center", color: "white" }}>Profile not found</p>;

  const tabs = ["posts", "liked", "favorites", "reposts"];

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-avatar">{profile.username.charAt(0).toUpperCase()}</div>
        <h2>{profile.username}</h2>
        <p>{profile.bio || "No bio yet"}</p>

        <div className="profile-stats">
          <div>{followersCount} Followers</div>
          <div>{followingCount} Following</div>
          {currentUser && currentUser.id !== id && (
            <button className={`follow-btn ${isFollowing ? "following" : ""}`} onClick={toggleFollow}>
              {isFollowing ? "Following" : "Follow"}
            </button>
          )}
        </div>

        <div className="profile-tabs">
          {tabs.map(tab => (
            <div
              key={tab}
              className={`tab ${activeTab === tab ? "active" : ""}`}
              onClick={() => { setActiveTab(tab); loadTabPosts(tab); }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </div>
          ))}
        </div>
      </div>

      <div className="profile-posts">
        {posts.length === 0 ? (
          <p style={{ textAlign: "center" }}>No posts yet</p>
        ) : (
          posts.map(p => (
            <div key={p.id} className="profile-post-card">
              <h3>{p.title}</h3>
              <p>{p.body}</p>
              <div className="post-meta">
                <button onClick={() => handleVote(p.id)}>❤️ {p.upvotes_count || 0}</button>
                <span>💬 {p.comments_count || 0}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
