// src/hooks/useLocalStorage.js

// We import useState because this custom hook still uses React state internally.
import { useState } from "react";

// This custom hook works like useState,
// but it also saves the value to localStorage.
export function useLocalStorage(key, initialValue) {
    // Create state with a special startup function.
    // React runs this function only once when the component first loads.
    const [storedValue, setStoredValue] = useState(() => {
        try {
            // Try to get an existing saved value from localStorage.
            const itemFromStorage = window.localStorage.getItem(key);

            // If something was saved before, convert it from JSON text back into real JavaScript.
            if (itemFromStorage) {
                return JSON.parse(itemFromStorage);
            }

            // If nothing was saved before, use the default value we provided.
            return initialValue;
        } catch (error) {
            // If localStorage breaks for some reason, log the problem.
            console.error(`Error reading localStorage key "${key}":`, error);

            // Fall back to the default value so the app still works.
            return initialValue;
        }
    });

    // This function updates both React state and localStorage.
    function setValue(valueOrFunction) {
        try {
            // Allow this hook to support both normal values and updater functions.
            // Example normal value:
            // setInventory(["LEGO", "chalk"])
            //
            // Example updater function:
            // setInventory((currentInventory) => [...currentInventory, "chalk"])
            const valueToStore =
                valueOrFunction instanceof Function
                    ? valueOrFunction(storedValue)
                    : valueOrFunction;

            // Update React state so the screen changes immediately.
            setStoredValue(valueToStore);

            // Save the new value into localStorage as JSON text.
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) {
            // If saving fails, show the error in the console.
            console.error(`Error setting localStorage key "${key}":`, error);
        }
    }

    // Return the saved value and the setter function,
    // just like React's built-in useState does.
    return [storedValue, setValue];
}