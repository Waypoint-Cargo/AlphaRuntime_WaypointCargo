import { useState, useCallback } from 'react';

/** Manages password visibility toggle state */
export function usePasswordVisibility() {
  const [isVisible, setIsVisible] = useState(false);
  const toggle = useCallback(() => setIsVisible((v) => !v), []);
  return { isVisible, toggle };
}
