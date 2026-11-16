import { useState, type ReactElement } from 'react';
import type { Place } from '../domain/schemas.js';
import { api, RequestFailed } from '../lib/api.js';
import { locateMe } from './locateMe.js';
import styles from './setup.module.css';

/** Finds the family's city by search, or by the browser's location with consent. */
export function PlaceField({
  place,
  onChange,
}: {
  place: Place | null;
  onChange: (place: Place) => void;
}): ReactElement {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [status, setStatus] = useState('');

  const search = async () => {
    if (query.trim().length < 2) {
      setStatus('Type at least two letters of your city.');
      return;
    }
    setStatus('Searching…');
    try {
      const found = await api.places(query.trim());
      setResults(found);
      setStatus(
        found.length === 0
          ? 'No places found. Try a nearby larger city.'
          : `${String(found.length)} places found.`,
      );
    } catch (error) {
      setStatus(error instanceof RequestFailed ? error.message : 'Search failed. Try again.');
    }
  };
  const locate = async () => {
    setStatus('Finding your location…');
    const found = await locateMe();
    if (found.place) {
      onChange(found.place);
      setQuery(found.place.name);
      setResults([]);
    }
    setStatus(found.message);
  };

  return (
    <fieldset className={styles['group']}>
      <legend>Where do you live?</legend>
      <div className={styles['searchRow']}>
        <label className="field">
          City or town
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void search();
              }
            }}
            autoComplete="address-level2"
          />
        </label>
        <button type="button" className="button button-quiet" onClick={() => void search()}>
          Search
        </button>
        <button type="button" className="button button-quiet" onClick={() => void locate()}>
          Use my location
        </button>
      </div>
      <p role="status" className="hint">
        {status || (place ? `Selected: ${place.name}.` : '')}
      </p>
      {results.length > 0 ? (
        <div className={styles['results']} role="group" aria-label="Search results">
          {results.map((result) => (
            <label key={`${String(result.lat)},${String(result.lon)}`} className={styles['choice']}>
              <input
                type="radio"
                name="place"
                checked={place?.lat === result.lat && place.lon === result.lon}
                onChange={() => {
                  onChange(result);
                  setStatus(`Selected: ${result.name}.`);
                }}
              />
              {result.name}
            </label>
          ))}
        </div>
      ) : null}
    </fieldset>
  );
}
