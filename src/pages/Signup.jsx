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

  const [verifyCard, setVerifyCard] = useState(false);

  const navigate = useNavigate();

  // Prevent logged-in users from seeing signup
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();

      if (data.session) {
        navigate("/feed", { replace: true });
      }
    };

    checkSession();
  }, [navigate]);


  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username,
            gender: gender
          }
        }
      });

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      // Clear fields
      setEmail("");
      setPassword("");
      setUsername("");
      setGender("male");

      // Wait for session to be ready
      const { data: sessionData } = await supabase.auth.getSession();

      if (sessionData.session) {
        navigate("/feed", { replace: true });
      } else {
        navigate("/login", { replace: true });
      }

    } catch (err) {
      console.error(err);
      setMessage("Unexpected error. Please try again.");
    }

    setLoading(false);
  };


  const handleGoogleSignup = async () => {

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/feed"
      }
    });

    if (error) {
      setMessage(error.message);
    }

  };


  return (
    <div className="container">

      <h1>PulseQ Sign Up</h1>

      <form onSubmit={handleSignup}>

        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          required
        />

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />

        <select value={gender} onChange={e => setGender(e.target.value)}>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>

        <button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Sign Up"}
        </button>

      </form>
<p>
  Already have an account?{" "}
  <span className="link" onClick={() => navigate("/login")}>
    Login
  </span>
</p>

<p>
  Or{" "}
  <span
    className="link"
    onClick={() => {
      localStorage.setItem("guest", "true");
      navigate("/feed");
    }}
  >
    Continue as Guest
  </span>
</p>

</div>

  );
}
