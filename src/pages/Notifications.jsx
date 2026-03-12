import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import "../styles/global.css";

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // -------------------------
  // Load current user
  // -------------------------
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    getUser();
  }, []);

  // -------------------------
  // Fetch notifications
  // -------------------------
  const fetchNotifications = async () => {
    if (!currentUser) return;

    try {
      const { data, error } = await supabase
        .from("notifications")
        .select(`
          *,
          profiles:actor_id(username)
        `)
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching notifications:", error);
        setNotifications([]);
      } else {
        setNotifications(data || []);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setNotifications([]);
    }
    setLoading(false);
  };

  // -------------------------
  // Real-time subscription
  // -------------------------
  useEffect(() => {
    if (!currentUser) return;

    fetchNotifications();

    const subscription = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${currentUser.id}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(subscription);
  }, [currentUser]);

  // -------------------------
  // Format time ago
  // -------------------------
  const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return seconds + "s ago";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + "m ago";
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + "h ago";
    const days = Math.floor(hours / 24);
    return days + "d ago";
  };

  if (loading) return <p style={{ textAlign: "center", color: "white" }}>Loading...</p>;

  return (
    <div className="notifications-page">
      <h2>Notifications</h2>

      {notifications.length === 0 ? (
        <p style={{ textAlign: "center" }}>No notifications yet</p>
      ) : (
        notifications.map((n) => (
          <div
            key={n.id}
            className="notification-card"
            onClick={() => n.post_id && navigate(`/post/${n.post_id}`)}
          >
            <strong>{n.profiles?.username || "User"}</strong>{" "}
            {n.type === "follow" && <span>started following you</span>}
            {n.type === "upvote" && <span>upvoted your post</span>}
            {n.type === "comment" && <span>commented: {n.message}</span>}

            <span className="notification-time">{timeAgo(n.created_at)}</span>
          </div>
        ))
      )}
    </div>
  );
}
