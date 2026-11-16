import type { ReactElement } from 'react';
/** The BreatheWise mark: a winter sun with two breaths of air drawn across it. */
function LogoMark({ size = 32 }: { size?: number }): ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <circle cx="16" cy="13" r="8.5" fill="var(--sun)" />
      <path
        d="M3.5 18.5c4.2-3.2 8.3 3.2 12.5 0s8.3-3.2 12.5 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M8 24.5c2.7-2 5.3 2 8 0s5.3-2 8 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Mark plus wordmark, used in page headers. */
export function Logo(): ReactElement {
  return (
    <span className="logo">
      <LogoMark />
      <span>BreatheWise</span>
    </span>
  );
}
