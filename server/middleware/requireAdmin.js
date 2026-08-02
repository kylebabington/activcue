// server/middleware/requireAdmin.js

/*
 * Require an administrator profile role.
 *
 * Role comes only from the server-loaded profiles row (req.profile).
 * Never infer administrator status from email or billing_exempt.
 *
 * Requires ensureUserProfile to have set req.profile first.
 */
export function requireAdmin(req, res, next) {
    if (!req.profile) {
        return res.status(500).json({
            error: "User profile information is unavailable.",
            code: "PROFILE_CONTEXT_MISSING",
        });
    }

    if (req.profile.role !== "admin") {
        return res.status(403).json({
            error: "Administrator access is required.",
            code: "ADMIN_REQUIRED",
        });
    }

    return next();
}
