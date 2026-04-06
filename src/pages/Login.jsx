import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import "../styles/auth.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showPass, setShowPass] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) navigate("/feed", { replace: true });
    };
    checkSession();
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMessage(error.message);
    else navigate("/feed", { replace: true });
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-blobs">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
      </div>

      <div className="auth-container">
        {/* Logo */}
        <div className="auth-logo-wrap">
          <img src="/pulseqlarge.png" alt="PulseQ" className="auth-logo" />
        </div>
                                    
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in to continue the conversation</p>

        <form onSubmit={handleLogin} className="auth-form">
          <div className="auth-field">
            <label>Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="auth-field">
            <label>Password</label>
            <div className="pass-wrap">
              <input
                type={showPass ? "text" : "password"}
                placeholder="Your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <button type="button" className="pass-toggle" onClick={() => setShowPass(!showPass)}>
                {showPass ? "🙈" : "👁"}
              </button>
            </div>
          </div>

          {message && <p className="auth-error">{message}</p>}

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? <span className="auth-spinner" /> : "Sign In"}
          </button>
        </form>

        <div className="auth-divider"><span>or</span></div>

        <button
          className="auth-btn auth-btn-ghost"
          onClick={() => { localStorage.setItem("guest", "true"); navigate("/feed"); }}
        >
          👀 Continue as Guest
        </button>

        <p className="auth-switch">
          Don't have an account?{" "}
          <span className="auth-link" onClick={() => navigate("/signup")}>Sign Up</span>
        </p>
      </div>
    </div>
  );
}

