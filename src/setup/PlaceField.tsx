import { useState, type ReactElement } from 'react';
import type { Place } from '../domain/schemas.js';
import { api, RequestFailed } from '../lib/api.js';
import { fieldId, useInvalid } from './fields.js';
import { locateMe } from './locateMe.js';
import styles from './setup.module.css';

/** Searches shorter than this match too many places to be useful. */
const MIN_QUERY_LENGTH = 2;

function searchMessage(found: readonly Place[]): string {
  return found.length === 0
    ? 'No places found. Try a nearby larger city.'
    : `${String(found.length)} places found.`;
}

/** The search box's text, its results and status, and the two ways to find a place. */
function usePlaceSearch(onChange: (place: Place) => void) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [status, setStatus] = useState('');

  const search = async () => {
    if (query.trim().length < MIN_QUERY_LENGTH) {
      setStatus('Type at least two letters of your city.');
      return;
    }
    setStatus('Searching…');
    try {
      const found = await api.places(query.trim());
      setResults(found);
      setStatus(searchMessage(found));
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
  const choose = (place: Place) => {
    onChange(place);
    setStatus(`Selected: ${place.name}.`);
  };
  return { query, setQuery, results, status, search, locate, choose };
}

/** The places a search found, as radio buttons. */
function SearchResults({
  results,
  selected,
  onChoose,
}: {
  results: readonly Place[];
  selected: Place | null;
  onChoose: (place: Place) => void;
}): ReactElement {
  return (
    <div className={styles['results']} role="group" aria-label="Search results">
      {results.map((result) => (
        <label key={`${String(result.lat)},${String(result.lon)}`} className={styles['choice']}>
          <input
            type="radio"
            name="place"
            checked={selected?.lat === result.lat && selected.lon === result.lon}
            onChange={() => {
              onChoose(result);
            }}
          />
          {result.name}
        </label>
      ))}
    </div>
  );
}

/** Finds the family's city by search, or by the browser's location with consent. */
export function PlaceField({
  place,
  onChange,
}: {
  place: Place | null;
  onChange: (place: Place) => void;
}): ReactElement {
  const { query, setQuery, results, status, search, locate, choose } = usePlaceSearch(onChange);
  const invalid = useInvalid('place');
  return (
    <fieldset className={styles['group']}>
      <legend>Where do you live?</legend>
      <div className={styles['searchRow']}>
        <label className="field">
          City or town
          <input
            id={fieldId('place')}
            aria-invalid={invalid}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return;
              event.preventDefault();
              void search();
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
        <SearchResults results={results} selected={place} onChoose={choose} />
      ) : null}
    </fieldset>
  );
}
