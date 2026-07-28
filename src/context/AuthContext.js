// src/context/AuthContext.js

import { createContext } from "react";

/*
 * The default value is null because using this context outside AuthProvider
 * is a programming error. The useAuth hook will detect that situation and
 * provide a useful error.
 */
export const AuthContext = createContext(null);