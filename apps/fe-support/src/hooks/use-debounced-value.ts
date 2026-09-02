import { useEffect, useState } from "react";

// A timer is genuinely imperative, so this is one of the few effects the app
// keeps: it stops a query firing on every keystroke of a search box.
export function useDebouncedValue<T>(value: T, delayMs = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);

    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
