import { type ReactElement, useRef, useState, type MouseEvent } from 'react';
import { navigate, usePageEntry } from '../app/navigation.js';
import { shortPlaceName } from '../domain/names.js';
import type { Profile } from '../domain/schemas.js';
import { clearProfile, loadProfile, saveProfile } from '../lib/storage.js';
import { SetupForm } from '../setup/SetupForm.js';
import { Logo } from '../ui/Logo.js';
import { ThemeToggle } from '../ui/ThemeToggle.js';
import { AirView } from './AirView.js';
import styles from './dashboard.module.css';

/** The assistant: set up the family once, then see today's air and plan. */
export function Dashboard(): ReactElement {
  const [profile, setProfile] = useState<Profile | null>(loadProfile);
  const [editing, setEditing] = useState(profile === null);
  const mainRef = useRef<HTMLElement>(null);
  usePageEntry('Your smog plan | BreatheWise', mainRef);
  const goHome = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    navigate('home');
  };
  const forget = () => {
    clearProfile();
    setProfile(null);
  };
  const save = (next: Profile) => {
    saveProfile(next);
    setProfile(next);
    setEditing(false);
  };

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
          {profile && !editing ? (
            <p className={styles['summary']}>
              {shortPlaceName(profile.place.name)}, {profile.members.length}{' '}
              {profile.members.length === 1 ? 'person' : 'people'}
            </p>
          ) : null}
          {profile && !editing ? (
            <button
              type="button"
              className="button button-quiet"
              onClick={() => {
                setEditing(true);
              }}
            >
              Change details
            </button>
          ) : null}
          <ThemeToggle />
        </div>
      </header>
      <main id="main" ref={mainRef} tabIndex={-1} className={styles['main']}>
        {editing || !profile ? (
          <SetupForm
            key={profile ? 'edit' : 'new'}
            initial={profile}
            onSave={save}
            {...(profile
              ? {
                  onCancel: () => {
                    setEditing(false);
                  },
                  onForget: forget,
                }
              : {})}
          />
        ) : (
          <AirView profile={profile} />
        )}
      </main>
    </div>
  );
}
