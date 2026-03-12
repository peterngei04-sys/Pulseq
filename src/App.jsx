import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Feed from "./pages/Feed";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";

/* ---------- Guest Route ---------- */

function GuestRoute({ children }) {

const [session, setSession] = useState(null);
const [loading, setLoading] = useState(true);

useEffect(() => {

supabase.auth.getSession().then(({ data }) => {
setSession(data.session);
setLoading(false);
});

}, []);

if (loading) return null;

return session ? <Navigate to="/feed" replace /> : children;

}

/* ---------- Protected Route ---------- */

function ProtectedRoute({ children }) {

const [session, setSession] = useState(null);
const [loading, setLoading] = useState(true);

useEffect(() => {

supabase.auth.getSession().then(({ data }) => {
setSession(data.session);
setLoading(false);
});

}, []);

if (loading) return null;

return session ? children : <Navigate to="/signup" replace />;

}

/* ---------- App ---------- */

export default function App() {

return (

<Router>

<Routes>

{/* Guest routes */}

<Route
path="/"
element={
<GuestRoute>
<Signup />
</GuestRoute>
}
/>

<Route
path="/signup"
element={
<GuestRoute>
<Signup />
</GuestRoute>
}
/>

<Route
path="/login"
element={
<GuestRoute>
<Login />
</GuestRoute>
}
/>

{/* Protected routes */}

<Route
path="/feed"
element={
<ProtectedRoute>
<Feed />
</ProtectedRoute>
}
/>

<Route
path="/notifications"
element={
<ProtectedRoute>
<Notifications />
</ProtectedRoute>
}
/>

<Route
path="/profile/:id"
element={
<ProtectedRoute>
<Profile />
</ProtectedRoute>
}
/>

{/* fallback */}

<Route path="*" element={<Navigate to="/" replace />} />

</Routes>

</Router>

);

}
