import { type ReactElement, useRef, type MouseEvent } from 'react';
import { navigate } from '../app/navigation.js';
import { Logo } from '../ui/Logo.js';
import styles from './landing.module.css';
import { SmogSky } from './SmogSky.js';
import { Story } from './Story.js';
import { useClarity } from './useClarity.js';

function StartLink({ children }: { children: string }) {
  const open = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    navigate('app');
  };
  return (
    <a href="/app" className="button" onClick={open}>
      {children}
    </a>
  );
}

/** The landing page: a scroll story in which the city's smog lifts as you read. */
export function Landing(): ReactElement {
  const rootRef = useRef<HTMLDivElement>(null);
  const clarity = useClarity(rootRef);

  return (
    <div ref={rootRef} className={styles['page']}>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <SmogSky clarity={clarity} />
      <header className={styles['topbar']}>
        <Logo />
        <StartLink>Check my air</StartLink>
      </header>
      <main id="main">
        <section className={styles['hero']} aria-labelledby="hero-title">
          <h1 id="hero-title" className={styles['headline']}>
            Clear the air.
          </h1>
          <p className={styles['lead']}>
            BreatheWise reads the smog forecast for your street and plans your family’s day around
            it: when to go out, when to shut the windows, and what each choice saves.
          </p>
          <StartLink>Check my air</StartLink>
          <p className={styles['scrollHint']} aria-hidden="true">
            Scroll to lift the smog
          </p>
        </section>
        <Story />
        <section className={styles['finale']} aria-labelledby="finale-title">
          <div className={styles['pane']}>
            <h2 id="finale-title">Breathe easier tonight.</h2>
            <p>
              Free, with no sign-up or account. Nothing about your family is stored on our servers.
            </p>
            <StartLink>Check my air</StartLink>
          </div>
        </section>
      </main>
      <footer className={styles['footer']}>
        <p>
          Forecasts from Copernicus CAMS via Open-Meteo. Explanations written by Google Gemini from
          BreatheWise’s own calculations. Not medical advice.
        </p>
      </footer>
    </div>
  );
}
