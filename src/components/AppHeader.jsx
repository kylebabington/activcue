// src/components/AppHeader.jsx

import { Link, NavLink } from "react-router-dom";
import ThemeSwitcher from "./ThemeSwitcher";

export default function AppHeader({
  kidDeviceMode,
  parentAreasLocked,
  isAnonymous,
  headerLogoutBusy,
  headerLogoutError,
  uiTheme,
  setUiTheme,
  uiThemes,
  onLogout,
}) {
  return (
    <header className={`app-header${kidDeviceMode ? " app-header--kid-device" : ""}`}>
      <div className="app-header-brand">
        <Link to="/" className="app-header-brand-link" aria-label="FamilyFlow home">
          <img
            className="app-brand-mark"
            src="/logo.svg"
            alt=""
            width="28"
            height="28"
          />
          <p className="app-brand-name">FamilyFlow</p>
        </Link>
      </div>

      <nav className="app-nav">
        <NavLink
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
        </NavLink>

        <NavLink
          to="/kid"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          Kid
        </NavLink>

        <NavLink
          to="/quest"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          Activity
        </NavLink>

        <NavLink
          to="/insights"
          className={({ isActive }) =>
            isActive ? "active" : parentAreasLocked ? "nav-muted" : ""
          }
          title={parentAreasLocked ? "Insights are locked" : undefined}
        >
          Insights
        </NavLink>

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            isActive ? "active" : parentAreasLocked ? "nav-muted" : ""
          }
          title={parentAreasLocked ? "Settings are locked" : undefined}
        >
          Settings
        </NavLink>
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
              <button
                type="button"
                className="app-header-auth-button"
                disabled={headerLogoutBusy}
                onClick={onLogout}
              >
                {headerLogoutBusy ? "Logging out…" : "Log out"}
              </button>
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
