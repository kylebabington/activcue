// src/components/AppHeader.jsx

import { useEffect, useId, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { BRAND } from "../config/brand.js";
import { prefetchAppRoute } from "../context/AppRoutes";
import ThemeSwitcher from "./ThemeSwitcher";
import { buildAppNavClassName } from "./appHeaderNav.js";

const DESKTOP_NAV_MQ = "(min-width: 768px)";

function PrefetchNavLink({ to, children, onNavigate, ...rest }) {
  return (
    <NavLink
      to={to}
      onMouseEnter={() => prefetchAppRoute(to)}
      onFocus={() => prefetchAppRoute(to)}
      onClick={() => {
        if (typeof onNavigate === "function") {
          onNavigate();
        }
      }}
      {...rest}
    >
      {children}
    </NavLink>
  );
}

function NavLinks({ parentAreasLocked, isAdmin, onNavigate, linkClassName = "" }) {
  const classFor = (mutedWhenInactive = false) => {
    return ({ isActive }) =>
      buildAppNavClassName({
        isActive,
        mutedWhenInactive,
        baseClass:
          typeof linkClassName === "function"
            ? linkClassName({ isActive })
            : linkClassName,
      });
  };

  return (
    <>
      <PrefetchNavLink
        to="/parent"
        className={classFor()}
        title={parentAreasLocked ? "Parent area is locked" : undefined}
        aria-label={parentAreasLocked ? "Parent (locked)" : "Parent"}
        onNavigate={onNavigate}
      >
        Parent
        {parentAreasLocked ? (
          <span className="nav-lock-mark" aria-hidden="true">
            ·
          </span>
        ) : null}
      </PrefetchNavLink>

      <PrefetchNavLink
        to="/kid"
        className={classFor()}
        onNavigate={onNavigate}
      >
        Kid
      </PrefetchNavLink>

      <PrefetchNavLink
        to="/quest"
        className={classFor()}
        onNavigate={onNavigate}
      >
        Activity
      </PrefetchNavLink>

      <PrefetchNavLink
        to="/my-activities"
        className={classFor(parentAreasLocked)}
        title={parentAreasLocked ? "My Activities are locked" : undefined}
        aria-label={
          parentAreasLocked ? "My Activities (locked)" : "My Activities"
        }
        onNavigate={onNavigate}
      >
        My Activities
        {parentAreasLocked ? (
          <span className="nav-lock-mark" aria-hidden="true">
            ·
          </span>
        ) : null}
      </PrefetchNavLink>

      <PrefetchNavLink
        to="/insights"
        className={classFor(parentAreasLocked)}
        title={parentAreasLocked ? "Insights are locked" : undefined}
        onNavigate={onNavigate}
      >
        Insights
      </PrefetchNavLink>

      <PrefetchNavLink
        to="/settings"
        className={classFor(parentAreasLocked)}
        title={parentAreasLocked ? "Settings are locked" : undefined}
        onNavigate={onNavigate}
      >
        Settings
      </PrefetchNavLink>

      {isAdmin ? (
        <>
          <PrefetchNavLink
            to="/admin/growth"
            className={classFor()}
            onNavigate={onNavigate}
          >
            Growth
          </PrefetchNavLink>
          <PrefetchNavLink
            to="/admin/feedback"
            className={classFor()}
            onNavigate={onNavigate}
          >
            Feedback
          </PrefetchNavLink>
          <PrefetchNavLink
            to="/admin/ai-usage"
            className={classFor()}
            onNavigate={onNavigate}
          >
            AI spend
          </PrefetchNavLink>
        </>
      ) : null}
    </>
  );
}

function AuthActions({
  isAnonymous,
  headerLogoutBusy,
  onLogout,
  onOpenFeedback,
  onNavigate,
}) {
  if (isAnonymous) {
    return (
      <>
        <Link
          className="app-header-auth-link"
          to="/login"
          onClick={onNavigate}
        >
          Log in
        </Link>
        <Link
          className="app-header-auth-link app-header-auth-link--primary"
          to="/signup"
          onClick={onNavigate}
        >
          Create account
        </Link>
      </>
    );
  }

  return (
    <>
      {typeof onOpenFeedback === "function" ? (
        <button
          type="button"
          className="app-header-auth-button"
          onClick={() => {
            onOpenFeedback();
            if (typeof onNavigate === "function") {
              onNavigate();
            }
          }}
        >
          Feedback
        </button>
      ) : null}
      <button
        type="button"
        className="app-header-auth-button"
        disabled={headerLogoutBusy}
        onClick={() => {
          onLogout();
          if (typeof onNavigate === "function") {
            onNavigate();
          }
        }}
      >
        {headerLogoutBusy ? "Logging out…" : "Log out"}
      </button>
    </>
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
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();
  const headerRef = useRef(null);
  const menuButtonRef = useRef(null);
  const drawerId = useId();

  const closeNav = () => setNavOpen(false);

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!navOpen) {
      return undefined;
    }

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setNavOpen(false);
        menuButtonRef.current?.focus();
      }
    };

    const onPointerDown = (event) => {
      if (!headerRef.current?.contains(event.target)) {
        setNavOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [navOpen]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return undefined;
    }

    const media = window.matchMedia(DESKTOP_NAV_MQ);
    const onChange = (event) => {
      if (event.matches) {
        setNavOpen(false);
      }
    };

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    }

    media.addListener(onChange);
    return () => media.removeListener(onChange);
  }, []);

  return (
    <header
      ref={headerRef}
      className={`app-header${kidDeviceMode ? " app-header--kid-device" : ""}${
        navOpen ? " app-header--nav-open" : ""
      }`}
    >
      <div className="app-header-bar">
        <div className="app-header-brand">
          <Link
            to="/"
            className="app-header-brand-link"
            aria-label={`${BRAND.name} home`}
          >
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

        <nav className="app-nav app-nav--desktop" aria-label="Primary">
          <NavLinks
            parentAreasLocked={parentAreasLocked}
            isAdmin={isAdmin}
          />
        </nav>

        <div className="app-header-actions app-header-actions--desktop">
          {!kidDeviceMode ? (
            <div className="app-header-auth">
              <AuthActions
                isAnonymous={isAnonymous}
                headerLogoutBusy={headerLogoutBusy}
                onLogout={onLogout}
                onOpenFeedback={onOpenFeedback}
              />
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

        <button
          ref={menuButtonRef}
          type="button"
          className="app-header-menu"
          aria-expanded={navOpen}
          aria-controls={drawerId}
          aria-label={navOpen ? "Close menu" : "Open menu"}
          onClick={() => setNavOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      <div
        id={drawerId}
        className={navOpen ? "app-nav-drawer is-open" : "app-nav-drawer"}
      >
        <nav className="app-nav app-nav--drawer" aria-label="Primary">
          <NavLinks
            parentAreasLocked={parentAreasLocked}
            isAdmin={isAdmin}
            onNavigate={closeNav}
            linkClassName="app-nav-drawer-link"
          />
        </nav>

        {!kidDeviceMode ? (
          <div className="app-nav-drawer-actions">
            <div className="app-header-auth">
              <AuthActions
                isAnonymous={isAnonymous}
                headerLogoutBusy={headerLogoutBusy}
                onLogout={onLogout}
                onOpenFeedback={onOpenFeedback}
                onNavigate={closeNav}
              />
            </div>
            <ThemeSwitcher
              theme={uiTheme}
              onChange={setUiTheme}
              themes={uiThemes}
              compact
            />
          </div>
        ) : null}

        {headerLogoutError ? (
          <p className="app-header-auth-error" role="alert">
            {headerLogoutError}
          </p>
        ) : null}
      </div>
    </header>
  );
}
