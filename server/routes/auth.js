// server/routes/auth.js

import { Router } from "express";
import { requireAuthenticatedUser } from "../middleware/requireAuthenticatedUser.js";

const router = Router();

/*
 * Return the currently authenticated Supabase user.
 *
 * The frontend sends the access-token JWT in the Authorization header.
 * requireAuthenticatedUser verifies that token before this handler runs.
 */
router.get("/auth/me", requireAuthenticatedUser, (req, res) => {
  res.json({
    userId: req.auth.userId,
    isAnonymous: req.auth.isAnonymous,
    email: req.auth.user.email || null,
  });
});

export default router;
