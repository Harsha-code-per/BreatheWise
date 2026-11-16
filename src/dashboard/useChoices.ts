/**
 * The steps the family has said they will do, remembered on this device.
 */
import { useCallback, useEffect, useState } from 'react';
import { toggleChoice } from '../domain/choices.js';
import { loadChoices, saveChoices } from '../lib/storage.js';

/** Chosen action ids and a function to choose or un-choose one. */
export interface Choices {
  chosen: readonly string[];
  toggle: (id: string) => void;
}

/** Tracks and persists the family's chosen actions. */
export function useChoices(): Choices {
  const [chosen, setChosen] = useState(loadChoices);
  useEffect(() => {
    saveChoices(chosen);
  }, [chosen]);
  const toggle = useCallback((id: string) => {
    setChosen((current) => toggleChoice(current, id));
  }, []);
  return { chosen, toggle };
}
