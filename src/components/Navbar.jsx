import React from "react";
import { Link } from "react-router-dom";

export default function Navbar({ session }) {
  return (
    <nav style={{ padding: "15px", borderBottom: "2px solid #333", textAlign: "center" }}>
      <Link to="/" style={{ margin: "0 10px" }}>Feed</Link>
      {session ? (
        <>
          <Link to="/create" style={{ margin: "0 10px" }}>Post</Link>
          <Link to="/profile" style={{ margin: "0 10px" }}>Profile</Link>
        </>
      ) : (
        <Link to="/login" style={{ margin: "0 10px" }}>Login</Link>
      )}
    </nav>
  );
}
