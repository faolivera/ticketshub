import { useLayoutEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

const SCROLL_POSITIONS_KEY = 'ticketshub:scroll-positions';

type ScrollPositionsMap = Record<string, number>;

function getScrollStorageKey(pathname: string, search: string, hash: string): string {
  return `${pathname}${search}${hash}`;
}

function restoreScrollWithRetry(targetY: number): void {
  const maxAttempts = 12;
  let attempts = 0;

  const apply = () => {
    attempts += 1;
    window.scrollTo(0, targetY);

    // Some pages grow after async rendering; retry until the target is reachable.
    const maxReachableY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const isReachable = maxReachableY >= targetY;

    if (!isReachable && attempts < maxAttempts) {
      window.requestAnimationFrame(apply);
    }
  };

  window.requestAnimationFrame(apply);
}

function readScrollPositions(): ScrollPositionsMap {
  if (typeof window === 'undefined') {
    return {};
  }

  const raw = window.sessionStorage.getItem(SCROLL_POSITIONS_KEY);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as ScrollPositionsMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeScrollPositions(positions: ScrollPositionsMap): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(SCROLL_POSITIONS_KEY, JSON.stringify(positions));
}

/**
 * Saves scroll before leaving a route and restores it on POP navigation.
 * Falls back to top scroll on non-POP navigations.
 */
export function ScrollRestorationManager() {
  const location = useLocation();
  const navigationType = useNavigationType();

  useLayoutEffect(() => {
    return () => {
      const key = getScrollStorageKey(
        location.pathname,
        location.search,
        location.hash,
      );
      const positions = readScrollPositions();
      positions[key] = window.scrollY;
      writeScrollPositions(positions);
    };
  }, [location, navigationType]);

  useLayoutEffect(() => {
    const key = getScrollStorageKey(
      location.pathname,
      location.search,
      location.hash,
    );
    const positions = readScrollPositions();

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
