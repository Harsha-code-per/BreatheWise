/**
 * Two-page navigation on the History API. Page changes run inside a View Transition where the
 * browser supports it, so moving from the landing page into the app feels like one surface.
 */
import { useEffect, useSyncExternalStore, type RefObject } from 'react';

export type Route = 'home' | 'app';

const CHANGE = 'bw:navigate';

/** True once the visitor has moved between pages in this tab (not on the first load). */
let navigated = false;

/** Maps a pathname to its page. */
export function routeOf(pathname: string): Route {
  return pathname.startsWith('/app') ? 'app' : 'home';
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('popstate', onChange);
  window.addEventListener(CHANGE, onChange);
  return () => {
    window.removeEventListener('popstate', onChange);
    window.removeEventListener(CHANGE, onChange);
  };
}

/** Current page, updated on back/forward and on `navigate`. */
export function useRoute(): Route {
  return useSyncExternalStore(subscribe, () => routeOf(window.location.pathname));
}

/** Goes to a page, animating the change when motion is allowed. */
export function navigate(to: Route): void {
  const change = () => {
    navigated = true;
    window.history.pushState(null, '', to === 'app' ? '/app' : '/');
    window.dispatchEvent(new Event(CHANGE));
    window.scrollTo(0, 0);
  };
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (calm || typeof document.startViewTransition !== 'function') change();
  else document.startViewTransition(change);
}

/**
 * Announces a page: sets the document title and, after in-app navigation, moves focus to the
 * page's main region so screen-reader users hear where they arrived.
 */
export function usePageEntry(title: string, main: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    document.title = title;
    if (navigated) main.current?.focus({ preventScroll: true });
  }, [title, main]);
}
