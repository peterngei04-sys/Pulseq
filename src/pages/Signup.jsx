import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

export default function Signup() {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [gender, setGender] = useState("male");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [verifyCard, setVerifyCard] = useState(false);

  const navigate = useNavigate();


const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      // Pass username and gender in the 'data' object. 
      // This goes into NEW.raw_user_meta_data in Postgres.
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

      // You NO LONGER need the .from("profiles").update() here!
      // The SQL trigger handles everything using the data above.

      setVerifyCard(true);
      setEmail("");
      setPassword("");
      setUsername("");
      setGender("male");

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




      {message && <p className="message">{message}</p>}


      {verifyCard && (
        <div className="verify-card">

          <h3>📧 Verify Your Email</h3>

          <p>
            Your account has been created successfully.
          </p>

          <p>
            Please check your email inbox and click the verification link to activate your PulseQ account.
          </p>

          <p>
            If you don't see the email, check your <strong>Spam</strong> or <strong>Junk</strong> folder.
          </p>

          <p>
            Need help? Contact support at:
          </p>

          <p className="support">
            socialpulsesupport@gmail.com
          </p>

          <button onClick={() => navigate("/login")}>
            Go to Login
          </button>

        </div>
      )}


      <p>
        Already have an account?{" "}
        <span className="link" onClick={() => navigate("/login")}>
          Login
        </span>
      </p>



    </div>
  );
}
