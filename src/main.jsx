// src/main.jsx

import React from "react";
import ReactDOM from "react-dom/client";
import {
  BrowserRouter,
  Route,
  Routes,
} from "react-router-dom";

import App from "./App.jsx";
import { AuthProvider } from "./context/AuthProvider.jsx";
import CompleteSignupPage from "./pages/CompleteSignupPage.jsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";
import SignupPage from "./pages/SignupPage.jsx";
import TermsPage from "./pages/TermsPage.jsx";

import "./index.css";

/*
 * Style Lab is a design tool for local work only.
 *
 * The lazy import keeps it out of the production bundle, and a pinned draft is
 * re-applied here so token experiments survive a reload.
 */
const StyleLabPage = import.meta.env.DEV
  ? React.lazy(() => import("./styleLab/StyleLabPage.jsx"))
  : null;

if (import.meta.env.DEV) {
  import("./styleLab/styleLabDraft.js").then(({ applyPinnedDraft }) =>
    applyPinnedDraft()
  );
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Offline shell is best-effort.
    });
  });
}

ReactDOM.createRoot(
  document.getElementById("root")
).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {StyleLabPage && (
          <Route
            path="/style-lab"
            element={
              <React.Suspense fallback={null}>
                <StyleLabPage />
              </React.Suspense>
            }
          />
        )}

        {/*
         * Public marketing page.
         *
         * Merely viewing the landing page does not create an anonymous
         * Supabase user.
         */}
        <Route
          path="/"
          element={<LandingPage />}
        />

        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsPage />} />

        {/*
         * Existing users log in directly.
         *
         * signInWithPassword establishes its own permanent session, so this
         * page does not need AuthProvider to create an anonymous session first.
         */}
        <Route
          path="/login"
          element={<LoginPage />}
        />

        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/*
         * Signup means converting the current visitor into a permanent user.
         *
         * AuthProvider restores an existing anonymous session or creates one
         * before SignupPage runs.
         */}
        <Route
          path="/signup"
          element={
            <AuthProvider>
              <SignupPage />
            </AuthProvider>
          }
        />

        {/*
         * Supabase redirects email confirmation links here.
         *
         * AuthProvider restores the confirmed session before the user chooses
         * a password.
         */}
        <Route
          path="/complete-signup"
          element={
            <AuthProvider>
              <CompleteSignupPage />
            </AuthProvider>
          }
        />

        {/*
         * All FamilyFlow application routes require a Supabase session.
         */}
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