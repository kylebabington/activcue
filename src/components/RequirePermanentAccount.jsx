// src/components/RequirePermanentAccount.jsx

import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import {
  canAccessPermanentApp,
  signupRedirectForProtectedPath,
} from "../utils/permanentAccountAccess";

/**
 * Blocks the real ActivCue app until the visitor has a permanent
 * (non-anonymous) Supabase account. Anonymous sessions and missing sessions
 * redirect to signup; login is linked from there.
 */
export default function RequirePermanentAccount({ children }) {
  const { user, isAnonymous, isAuthReady } = useAuth();
  const location = useLocation();

  if (!isAuthReady) {
    return null;
  }

  if (!canAccessPermanentApp({ user, isAnonymous })) {
    return (
      <Navigate
        to={signupRedirectForProtectedPath(
          location.pathname,
          location.search
        )}
        replace
      />
    );
  }

  return children;
}
