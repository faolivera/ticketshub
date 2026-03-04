import { useState, useEffect } from 'react';

/**
 * Returns whether the user has in-app navigation history (same tab).
 * When true, it's safe to show a "Back" control that calls navigate(-1).
 * When false (e.g. direct URL, new tab), we should not show Back to avoid leaving the app.
 */
export function useCanGoBack(): boolean {
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    setCanGoBack(typeof window !== 'undefined' && window.history.length > 1);
  }, []);

  return canGoBack;
}
