// src/hooks/useLocalStorage.js

import { useCallback, useState } from "react";

/**
 * useState-like persistence to localStorage.
 * Functional updaters receive React's previous state (not a stale closure).
 */
export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const itemFromStorage = window.localStorage.getItem(key);

      if (itemFromStorage) {
        return JSON.parse(itemFromStorage);
      }

      return initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback(
    (valueOrFunction) => {
      setStoredValue((previousValue) => {
        try {
          const valueToStore =
            valueOrFunction instanceof Function
              ? valueOrFunction(previousValue)
              : valueOrFunction;

          window.localStorage.setItem(key, JSON.stringify(valueToStore));
          return valueToStore;
        } catch (error) {
          console.error(`Error setting localStorage key "${key}":`, error);
          return previousValue;
        }
      });
    },
    [key]
  );

  return [storedValue, setValue];
}
