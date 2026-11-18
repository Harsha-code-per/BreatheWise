import { type ReactElement, useEffect, useRef } from 'react';
import type { FieldError } from './draft.js';
import { fieldId } from './fields.js';
import styles from './setup.module.css';

/** One problem, as a link that moves focus straight to the input it is about. */
function ErrorLink({ error }: { error: FieldError }): ReactElement {
  const target = fieldId(error.field);
  return (
    <a
      href={`#${target}`}
      onClick={(event) => {
        event.preventDefault();
        document.getElementById(target)?.focus();
      }}
    >
      {error.message}
    </a>
  );
}

/** The problems found on submit. It takes focus so screen readers announce it at once. */
export function ErrorSummary({ errors }: { errors: readonly FieldError[] }): ReactElement | null {
  const summary = useRef<HTMLDivElement>(null);
  useEffect(() => {
    summary.current?.focus();
  }, [errors]);
  if (errors.length === 0) return null;

  const count = errors.length === 1 ? 'one thing' : `${String(errors.length)} things`;
  return (
    <div
      ref={summary}
      tabIndex={-1}
      role="alert"
      className={styles['errors']}
      aria-labelledby="errors-title"
    >
      <h2 id="errors-title">Please fix {count}</h2>
      <ul>
        {errors.map((error) => (
          <li key={error.message}>
            <ErrorLink error={error} />
          </li>
        ))}
      </ul>
    </div>
  );
}
