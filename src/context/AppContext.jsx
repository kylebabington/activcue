import { createContext, useContext } from "react";

const AppContext = createContext(null);

export function AppProvider({ value, children }) {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- context hook
export function useAppContext() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error("useAppContext must be used within AppProvider.");
  }

  return context;
}
