import { useLayoutEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

const SCROLL_POSITIONS_KEY = 'ticketshub:scroll-positions';

// Parse sessionStorage once at module load; use memory map for all subsequent reads.
const positions: Record<string, number> = (() => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.sessionStorage.getItem(SCROLL_POSITIONS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
})();

// Tell the browser not to restore scroll on its own — we handle it.
if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

function getKey(pathname: string, search: string, hash: string): string {
  return `${pathname}${search}${hash}`;
}

function savePosition(key: string, y: number): void {
  positions[key] = y;
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(SCROLL_POSITIONS_KEY, JSON.stringify(positions));
  }
}

function restoreScrollWithRetry(targetY: number): void {
  // Synchronous attempt: runs inside useLayoutEffect, before the browser paints.
  window.scrollTo(0, targetY);

  // Retry via rAF for pages that grow after async rendering.
  let attempts = 0;
  const retry = () => {
    const maxReachableY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    if (maxReachableY >= targetY) return;
    window.scrollTo(0, targetY);
    if (++attempts < 12) window.requestAnimationFrame(retry);
  };
  window.requestAnimationFrame(retry);
}

/**
 * Saves scroll before leaving a route and restores it on POP navigation.
 * Falls back to top scroll on non-POP navigations.
 */
export function ScrollRestorationManager() {
  const location = useLocation();
  const navigationType = useNavigationType();

  // Save position on route leave.
  useLayoutEffect(() => {
    return () => {
      const key = getKey(location.pathname, location.search, location.hash);
      savePosition(key, window.scrollY);
    };
  }, [location, navigationType]);

  // Restore or reset position on route enter.
  useLayoutEffect(() => {
    const key = getKey(location.pathname, location.search, location.hash);

    if (navigationType === 'POP') {
      const savedY = positions[key];
      if (typeof savedY === 'number') {
        restoreScrollWithRetry(savedY);
        return;
      }
    }

    window.scrollTo(0, 0);
  }, [location, navigationType]);

  return null;
}
