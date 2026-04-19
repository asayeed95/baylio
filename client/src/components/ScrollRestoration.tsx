import { useEffect, useRef } from "react";
import { useLocation } from "wouter";

/**
 * SPA scroll restoration.
 *
 * Browsers can't auto-restore scroll for SPAs because the URL change happens
 * via history.pushState, not a real navigation. We track it manually:
 *
 * 1. Disable native scroll restoration.
 * 2. A `popstate` listener flags the next location change as a Back/Forward.
 * 3. On every location change, save the outgoing scroll position for the old
 *    path, then either restore the saved position (if popstate) or scroll to
 *    top (if forward navigation).
 */
export function ScrollRestoration() {
  const [location] = useLocation();
  const prevLocation = useRef(location);
  const isPop = useRef(false);

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    const onPop = () => {
      isPop.current = true;
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    sessionStorage.setItem(`scroll:${prevLocation.current}`, String(window.scrollY));

    const key = `scroll:${location}`;
    const saved = sessionStorage.getItem(key);

    if (isPop.current && saved) {
      const y = parseInt(saved, 10);
      requestAnimationFrame(() => window.scrollTo(0, y));
    } else {
      window.scrollTo(0, 0);
    }

    isPop.current = false;
    prevLocation.current = location;
  }, [location]);

  return null;
}
