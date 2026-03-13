import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/global.css";
import { supabase } from "./lib/supabase";

async function startApp() {

  // Restore session before rendering app
  await supabase.auth.getSession();

  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );

}

startApp();
