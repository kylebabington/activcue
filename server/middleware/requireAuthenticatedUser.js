// server/middleware/requireAuthenticatedUser.js

import { getSupabaseAuthClient } from "../lib/supabaseAuthClient.js";

/*
 * Require a valid Supabase access-token JWT.
 *
 * Expected request header:
 *
 *   Authorization: Bearer eyJ...
 */
export async function requireAuthenticatedUser(req, res, next) {
    const authorizationHeader = req.get("authorization") || "";

    /*
     * Match "Bearer", followed by one or more spaces, followed by the token.
     *
     * The "i" flag makes Bearer case-insensitive.
     */
    const bearerMatch = authorizationHeader.match(/^Bearer\s+(.+)$/i);
    const accessToken = bearerMatch?.[1]?.trim();

    if (!accessToken) {
        return res.status(401).json({
            error: "Authentication required.",
        });
    }

    try {
        const supabase = getSupabaseAuthClient();

        /*
         * getUser(accessToken) sends the token to Supabase Auth for validation.
         *
         * This verifies that:
         * - the token is correctly signed
         * - the token has not expired
         * - it identifies a real Supabase user
         */
        const {
            data: userData,
            error: userError,
        } = await supabase.auth.getUser(accessToken);

        if (userError || !userData.user) {
            return res.status(401).json({
                error: "Invalid or expired authentication token.",
            });
        }

        /*
         * Attach verified identity information to the Express request.
         *
         * Future authorization and entitlement middleware will use:
         *
         *   req.auth.userId
         */
        req.auth = {
            accessToken,
            user: userData.user,
            userId: userData.user.id,
            isAnonymous:
                userData.user.is_anonymous === true ||
                userData.user.app_metadata?.provider === "anonymous",
        };

        return next();
    } catch (error) {
        console.error("Authentication middleware error:", error);

        return res.status(500).json({
            error: "Could not verify the authentication session.",
        });
    }
}