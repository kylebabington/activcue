// src/main.jsx

// React is the library that lets us build the user interface.
import React from "react";

// ReactDOM is the package that attaches our React app to the real HTML page.
import ReactDOM from "react-dom/client";

// BrowserRouter turns our React app into a multi-page app.
// It lets us use routes like /parent, /kid, /quest, and /settings.
import { BrowserRouter } from "react-router-dom";

// App is our main application component.
import App from "./App.jsx";

// AuthProvider creates or restores the anonymous Supabase session on load.
import { AuthProvider } from "./context/AuthProvider.jsx";

// This imports the global CSS file created by Vite.
import "./index.css";

// This finds the <div id="root"></div> in index.html,
// then tells React to render our app inside that div.
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {/* BrowserRouter gives routing power to everything inside App. */}
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);