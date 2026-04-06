import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import "../styles/auth.css";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [gender, setGender] = useState("male");
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

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username, gender } }
      });
      if (error) { setMessage(error.message); setLoading(false); return; }
      setEmail(""); setPassword(""); setUsername(""); setGender("male");
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) navigate("/feed", { replace: true });
      else navigate("/login", { replace: true });
    } catch (err) {
      console.error(err);
      setMessage("Unexpected error. Please try again.");
    }
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
                                    
        <h1 className="auth-title">Join PulseQ</h1>
        <p className="auth-subtitle">Where real conversations happen</p>

        <form onSubmit={handleSignup} className="auth-form">
          <div className="auth-field">
            <label>Username</label>
            <input
              type="text"
              placeholder="Pick a username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
          </div>

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
                placeholder="Create a password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <button type="button" className="pass-toggle" onClick={() => setShowPass(!showPass)}>
                {showPass ? "🙈" : "👁"}
              </button>
            </div>
          </div>

          <div className="auth-field">
            <label>Gender</label>
            <select value={gender} onChange={e => setGender(e.target.value)}>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          {message && <p className="auth-error">{message}</p>}

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? <span className="auth-spinner" /> : "Create Account"}
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
          Already have an account?{" "}
          <span className="auth-link" onClick={() => navigate("/login")}>Sign In</span>
        </p>
      </div>
    </div>
  );
}

