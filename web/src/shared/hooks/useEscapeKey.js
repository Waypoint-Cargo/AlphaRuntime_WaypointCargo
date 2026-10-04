import { useEffect } from "react";

// Calls `onEscape` when Escape is pressed, unless `disabled` (e.g. while a request is in flight).
export function useEscapeKey(onEscape, disabled = false) {
  useEffect(() => {
    if (disabled) return undefined;

    const onKeyDown = (event) => event.key === "Escape" && onEscape();
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onEscape, disabled]);
}
