function ThemeSwitcher({ theme, onChange, themes, compact = false }) {
  return (
    <div
      className={
        compact ? "theme-switcher theme-switcher--compact" : "theme-switcher"
      }
      role="group"
      aria-label="Visual theme"
    >
      {!compact && (
        <p className="theme-switcher-label">Look & feel</p>
      )}

      <div className="theme-switcher-options">
        {themes.map((option) => {
          const isActive = theme === option.id;

          return (
            <button
              key={option.id}
              type="button"
              className={
                isActive
                  ? "theme-switcher-option active"
                  : "theme-switcher-option"
              }
              aria-pressed={isActive}
              title={option.description}
              onClick={() => onChange(option.id)}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {!compact && (
        <p className="theme-switcher-hint">
          Try each look — your choice is saved on this device.
        </p>
      )}
    </div>
  );
}

export default ThemeSwitcher;
