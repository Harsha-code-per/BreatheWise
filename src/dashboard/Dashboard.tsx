import { type MouseEvent, type ReactElement, useRef } from 'react';
import { navigate, usePageEntry } from '../app/navigation.js';
import { shortPlaceName } from '../domain/names.js';
import type { Profile } from '../domain/schemas.js';
import { SetupForm } from '../setup/SetupForm.js';
import { Logo } from '../ui/Logo.js';
import { ThemeToggle } from '../ui/ThemeToggle.js';
import { AirView } from './AirView.js';
import styles from './dashboard.module.css';
import { useProfile } from './useProfile.js';

function goHome(event: MouseEvent<HTMLAnchorElement>) {
  event.preventDefault();
  navigate('home');
}

/** Who the plan is for, with a way to change it; hidden while the form is open. */
function ProfileSummary({ profile, onEdit }: { profile: Profile; onEdit: () => void }) {
  const people = profile.members.length;
  return (
    <>
      <p className={styles['summary']}>
        {shortPlaceName(profile.place.name)}, {people} {people === 1 ? 'person' : 'people'}
      </p>
      <button type="button" className="button button-quiet" onClick={onEdit}>
        Change details
      </button>
    </>
  );
}

/** The assistant: set up the family once, then see today's air and plan. */
export function Dashboard(): ReactElement {
  const { profile, editing, edit, cancel, save, forget } = useProfile();
  const mainRef = useRef<HTMLElement>(null);
  usePageEntry('Your smog plan | BreatheWise', mainRef);

  return (
    <div className={styles['app']}>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className={styles['header']}>
        <a href="/" onClick={goHome} aria-label="BreatheWise home">
          <Logo />
        </a>
        <div className={styles['headerActions']}>
          {profile && !editing ? <ProfileSummary profile={profile} onEdit={edit} /> : null}
          <ThemeToggle />
        </div>
      </header>
      <main id="main" ref={mainRef} tabIndex={-1} className={styles['main']}>
        {editing || !profile ? (
          <SetupForm
            key={profile ? 'edit' : 'new'}
            initial={profile}
            onSave={save}
            {...(profile ? { onCancel: cancel, onForget: forget } : {})}
          />
        ) : (
          <AirView profile={profile} />
        )}
      </main>
    </div>
  );
}
