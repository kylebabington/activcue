// src/components/AppHeader.jsx

import { Link, NavLink } from "react-router-dom";
import { BRAND } from "../config/brand.js";
import { prefetchAppRoute } from "../context/AppRoutes";
import ThemeSwitcher from "./ThemeSwitcher";

function PrefetchNavLink({ to, children, ...rest }) {
  return (
    <NavLink
      to={to}
      onMouseEnter={() => prefetchAppRoute(to)}
      onFocus={() => prefetchAppRoute(to)}
      {...rest}
    >
      {children}
    </NavLink>
  );
}

export default function AppHeader({
  kidDeviceMode,
  parentAreasLocked,
  isAnonymous,
  isAdmin = false,
  headerLogoutBusy,
  headerLogoutError,
  uiTheme,
  setUiTheme,
  uiThemes,
  onLogout,
  onOpenFeedback,
}) {
  return (
    <header className={`app-header${kidDeviceMode ? " app-header--kid-device" : ""}`}>
      <div className="app-header-brand">
        <Link to="/" className="app-header-brand-link" aria-label={`${BRAND.name} home`}>
          <img
            className="app-brand-mark"
            src="/logo.svg"
            alt=""
            width="28"
            height="28"
          />
          <p className="app-brand-name">{BRAND.name}</p>
        </Link>
      </div>

      <nav className="app-nav">
        <PrefetchNavLink
          to="/parent"
          className={({ isActive }) => (isActive ? "active" : "")}
          title={parentAreasLocked ? "Parent area is locked" : undefined}
          aria-label={parentAreasLocked ? "Parent (locked)" : "Parent"}
        >
          Parent
          {parentAreasLocked && (
            <span className="nav-lock-mark" aria-hidden="true">
              ·
            </span>
          )}
        </PrefetchNavLink>

        <PrefetchNavLink
          to="/kid"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          Kid
        </PrefetchNavLink>

        <PrefetchNavLink
          to="/quest"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          Activity
        </PrefetchNavLink>

        <PrefetchNavLink
          to="/my-activities"
          className={({ isActive }) =>
            isActive ? "active" : parentAreasLocked ? "nav-muted" : ""
          }
          title={parentAreasLocked ? "My Activities are locked" : undefined}
          aria-label={
            parentAreasLocked ? "My Activities (locked)" : "My Activities"
          }
        >
          My Activities
          {parentAreasLocked && (
            <span className="nav-lock-mark" aria-hidden="true">
              ·
            </span>
          )}
        </PrefetchNavLink>

        <PrefetchNavLink
          to="/insights"
          className={({ isActive }) =>
            isActive ? "active" : parentAreasLocked ? "nav-muted" : ""
          }
          title={parentAreasLocked ? "Insights are locked" : undefined}
        >
          Insights
        </PrefetchNavLink>

        <PrefetchNavLink
          to="/settings"
          className={({ isActive }) =>
            isActive ? "active" : parentAreasLocked ? "nav-muted" : ""
          }
          title={parentAreasLocked ? "Settings are locked" : undefined}
        >
          Settings
        </PrefetchNavLink>

        {isAdmin ? (
          <>
            <PrefetchNavLink
              to="/admin/growth"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              Growth
            </PrefetchNavLink>
            <PrefetchNavLink
              to="/admin/feedback"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              Feedback
            </PrefetchNavLink>
          </>
        ) : null}
      </nav>

      <div className="app-header-actions">
        {!kidDeviceMode ? (
          <div className="app-header-auth">
            {isAnonymous ? (
              <>
                <Link className="app-header-auth-link" to="/login">
                  Log in
                </Link>
                <Link
                  className="app-header-auth-link app-header-auth-link--primary"
                  to="/signup"
                >
                  Create account
                </Link>
              </>
            ) : (
              <>
                {typeof onOpenFeedback === "function" ? (
                  <button
                    type="button"
                    className="app-header-auth-button"
                    onClick={onOpenFeedback}
                  >
                    Feedback
                  </button>
                ) : null}
                <button
                  type="button"
                  className="app-header-auth-button"
                  disabled={headerLogoutBusy}
                  onClick={onLogout}
                >
                  {headerLogoutBusy ? "Logging out…" : "Log out"}
                </button>
              </>
            )}
          </div>
        ) : null}

        {headerLogoutError ? (
          <p className="app-header-auth-error" role="alert">
            {headerLogoutError}
          </p>
        ) : null}

        {!kidDeviceMode ? (
          <ThemeSwitcher
            theme={uiTheme}
            onChange={setUiTheme}
            themes={uiThemes}
            compact
          />
        ) : null}
      </div>
    </header>
  );
}
