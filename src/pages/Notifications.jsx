import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import "../styles/globale.css";
import "../styles/notifications.css";

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [following, setFollowing] = useState(new Set()); // who currentUser follows
  const [loading, setLoading] = useState(true);

  /* -------------------------
  Load current user
  ------------------------- */
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      if (user) {
        const { data: followData } = await supabase
          .from("follows").select("following_id").eq("follower_id", user.id);
        if (followData) setFollowing(new Set(followData.map(f => f.following_id)));
      }
    };
    getUser();
  }, []);

  /* -------------------------
  Fetch notifications
  ------------------------- */
  const fetchNotifications = async () => {
    if (!currentUser) return;
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*, profiles:actor_id(id, username)")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false });

      if (error) { console.error(error); setNotifications([]); }
      else setNotifications(data || []);
    } catch (err) {
      console.error(err);
      setNotifications([]);
    }
    setLoading(false);
  };

  /* -------------------------
  Mark all as read when opened
  ------------------------- */
  const markAllRead = async () => {
    if (!currentUser) return;
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", currentUser.id)
      .eq("read", false);
  };

  /* -------------------------
  Real-time subscription
  ------------------------- */
  useEffect(() => {
    if (!currentUser) return;
    fetchNotifications();
    markAllRead();

    const sub = supabase
      .channel("notif-channel-" + currentUser.id)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: "user_id=eq." + currentUser.id,
      }, async (payload) => {
        /* Fetch actor username for real-time notification */
        const { data: actor } = await supabase
          .from("profiles").select("id, username").eq("id", payload.new.actor_id).single();
        setNotifications(prev => [{ ...payload.new, profiles: actor }, ...prev]);
      })
      .subscribe();

    return () => supabase.removeChannel(sub);
  }, [currentUser]);

  /* -------------------------
  Follow back
  ------------------------- */
  const handleFollowBack = async (actorId, e) => {
    e.stopPropagation();
    if (!currentUser) return;
    if (following.has(actorId)) {
      /* Unfollow */
      await supabase.from("follows").delete()
        .eq("follower_id", currentUser.id).eq("following_id", actorId);
      setFollowing(prev => { const s = new Set(prev); s.delete(actorId); return s; });
    } else {
      /* Follow back */
      await supabase.from("follows").insert({ follower_id: currentUser.id, following_id: actorId });
      setFollowing(prev => new Set([...prev, actorId]));
      await supabase.from("notifications").insert({
        user_id: actorId, actor_id: currentUser.id, type: "follow", message: "started following you"
      });
    }
  };

  /* -------------------------
  Time ago
  ------------------------- */
  const timeAgo = (date) => {
    const s = Math.floor((new Date() - new Date(date)) / 1000);
    if (s < 60) return s + "s";
    const m = Math.floor(s / 60);
    if (m < 60) return m + "m";
    const h = Math.floor(m / 60);
    if (h < 24) return h + "h";
    return Math.floor(h / 24) + "d";
  };

  /* -------------------------
  Notification icon + text
  ------------------------- */
  const getNotifMeta = (type) => {
    switch (type) {
      case "vote":
      case "upvote":    return { icon: "🔥", text: "upvoted your post", color: "#f97316" };
      case "comment":   return { icon: "💬", text: "commented on your post", color: "#60a5fa" };
      case "reply":     return { icon: "↩️", text: "replied to your comment", color: "#34d399" };
      case "follow":    return { icon: "👤", text: "started following you", color: "#a78bfa" };
      case "favorite":  return { icon: "⭐", text: "added your post to favorites", color: "#fbbf24" };
      case "repost":    return { icon: "🔄", text: "reposted your post", color: "#34d399" };
      default:          return { icon: "🔔", text: "interacted with your content", color: "#9ca3af" };
    }
  };

  if (loading) return (
    <div className="notif-loading">
      <div className="notif-loading-dots">
        <span /><span /><span />
      </div>
    </div>
  );

  return (
    <div className="notifications-page">

      <div className="notif-header">
        <button className="notif-back" onClick={() => navigate(-1)}>←</button>
        <h2>Notifications</h2>
        {notifications.some(n => !n.read) && (
          <span className="notif-unread-badge">{notifications.filter(n => !n.read).length}</span>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="notif-empty">
          <div className="notif-empty-icon">🔔</div>
          <p>You're all caught up!</p>
          <span>Notifications will appear here.</span>
        </div>
      ) : (
        <div className="notif-list">
          {notifications.map((n) => {
            const meta = getNotifMeta(n.type);
            const actorName = n.profiles?.username || "Someone";
            const actorId = n.profiles?.id;
            const isFollowNotif = n.type === "follow";
            const alreadyFollowing = following.has(actorId);

            return (
              <div
                key={n.id}
                className={"notification-card" + (!n.read ? " unread" : "")}
                onClick={() => {
                  if (n.post_id) navigate("/post/" + n.post_id);
                  else if (actorId) navigate("/profile/" + actorId);
                }}
              >
                {/* Unread dot */}
                {!n.read && <div className="notif-dot" />}

                {/* Actor avatar */}
                <div
                  className="notif-avatar"
                  style={{ background: "linear-gradient(135deg, " + meta.color + "55, " + meta.color + "99)" }}
                  onClick={e => { e.stopPropagation(); actorId && navigate("/profile/" + actorId); }}
                >
                  {actorName.charAt(0).toUpperCase()}
                </div>

                {/* Content */}
                <div className="notif-content">
                  <div className="notif-text">
                    <span className="notif-actor">{actorName}</span>
                    {" "}
                    <span className="notif-action">{meta.text}</span>
                  </div>
                  <div className="notif-time">{timeAgo(n.created_at)} ago</div>
                </div>

                {/* Right side */}
                <div className="notif-right">
                  <span className="notif-type-icon">{meta.icon}</span>
                  {isFollowNotif && actorId && actorId !== currentUser?.id && (
                    <button
                      className={"notif-follow-btn" + (alreadyFollowing ? " following" : "")}
                      onClick={e => handleFollowBack(actorId, e)}
                    >
                      {alreadyFollowing ? "Following" : "Follow"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
