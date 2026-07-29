// src/main.jsx

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import App from "./App.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import { AuthProvider } from "./context/AuthProvider.jsx";

import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Marketing is public — no Supabase session required. */}
        <Route path="/" element={<LandingPage />} />

        {/* In-app routes establish (or restore) an anonymous session first. */}
        <Route
          path="*"
          element={
            <AuthProvider>
              <App />
            </AuthProvider>
          }
        />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
