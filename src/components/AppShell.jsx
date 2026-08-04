// src/components/AppShell.jsx

import AppHeader from "./AppHeader";

export function AppShellLoading() {
  return (
    <main
      role="status"
      aria-live="polite"
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "2rem",
      }}
    >
      <p>Loading family settings…</p>
    </main>
  );
}

export function AppShellError({ message }) {
  return (
    <main
      role="alert"
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <section>
        <p>{message}</p>
        <button type="button" onClick={() => window.location.reload()}>
          Try again
        </button>
      </section>
    </main>
  );
}

export function AppShell({
  kidDeviceMode,
  parentAreasLocked,
  isAnonymous,
  headerLogoutBusy,
  headerLogoutError,
  uiTheme,
  setUiTheme,
  uiThemes,
  onLogout,
  familySettingsSaveStatus,
  retryFamilySettingsSave,
  statusMessage,
  statusType,
  children,
}) {
  return (
    <main className={`app-shell${kidDeviceMode ? " app-shell--kid-device" : ""}`}>
      <AppHeader
        kidDeviceMode={kidDeviceMode}
        parentAreasLocked={parentAreasLocked}
        isAnonymous={isAnonymous}
        headerLogoutBusy={headerLogoutBusy}
        headerLogoutError={headerLogoutError}
        uiTheme={uiTheme}
        setUiTheme={setUiTheme}
        uiThemes={uiThemes}
        onLogout={onLogout}
      />

      {familySettingsSaveStatus === "error" ? (
        <div
          className="status-message status-message--error family-settings-save-error"
          role="alert"
        >
          <p>
            Your latest changes were not saved. Check your connection and try
            again.
          </p>
          <button type="button" onClick={retryFamilySettingsSave}>
            Try again
          </button>
        </div>
      ) : null}

      {statusMessage ? (
        <p
          className={`status-message status-message--${statusType}`}
          role="status"
          aria-live="polite"
        >
          {statusMessage}
        </p>
      ) : null}

      {children}
    </main>
  );
}
