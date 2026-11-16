/**
 * Two-page navigation on the History API. Page changes run inside a View Transition where the
 * browser supports it, so moving from the landing page into the app feels like one surface.
 */
import { useSyncExternalStore } from 'react';

export type Route = 'home' | 'app';

const CHANGE = 'bw:navigate';

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
    window.history.pushState(null, '', to === 'app' ? '/app' : '/');
    window.dispatchEvent(new Event(CHANGE));
    window.scrollTo(0, 0);
  };
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (calm || typeof document.startViewTransition !== 'function') change();
  else document.startViewTransition(change);
}
