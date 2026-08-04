// src/features/app/useHeaderLogout.js

import { useState } from "react";
import { signOutCurrentUser } from "../../api/authApi";

export function useHeaderLogout() {
  const [headerLogoutBusy, setHeaderLogoutBusy] = useState(false);
  const [headerLogoutError, setHeaderLogoutError] = useState("");

  async function handleHeaderLogout() {
    setHeaderLogoutError("");
    setHeaderLogoutBusy(true);

    try {
      await signOutCurrentUser();
      window.location.assign("/login");
    } catch (error) {
      console.error("Could not log out:", error);
      setHeaderLogoutError(
        error instanceof Error
          ? error.message
          : "Could not log out. Try again."
      );
      setHeaderLogoutBusy(false);
    }
  }

  return {
    headerLogoutBusy,
    headerLogoutError,
    handleHeaderLogout,
  };
}
