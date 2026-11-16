/**
 * "Use my location": asks the browser for coordinates and names them; when the browser cannot
 * pinpoint the device (common on desktops without GPS or Wi-Fi positioning) it falls back to the
 * approximate city of the network. Each outcome gets a message that says what happened.
 */
import type { Place } from '../domain/schemas.js';
import { api, RequestFailed } from '../lib/api.js';

/** Where the search box and status line should end up. */
export interface Located {
  place: Place | null;
  message: string;
}

const PERMISSION_DENIED = 1;
const ASK_TIMEOUT_MS = 10_000;

function position(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      maximumAge: 600_000,
      timeout: ASK_TIMEOUT_MS,
    });
  });
}

async function fromNetwork(): Promise<Located> {
  try {
    const place = await api.locate(null);
    return {
      place,
      message: `Your browser could not pinpoint you, so we used your network’s approximate location: ${place.name}. Search if that is wrong.`,
    };
  } catch (error) {
    return {
      place: null,
      message:
        error instanceof RequestFailed
          ? error.message
          : 'We could not find your location. Search for your city instead.',
    };
  }
}

/** Finds the user's place, preferring the browser's own location. */
export async function locateMe(): Promise<Located> {
  if (!('geolocation' in navigator)) return fromNetwork();
  let coords: GeolocationCoordinates;
  try {
    coords = (await position()).coords;
  } catch (error) {
    const denied = (error as GeolocationPositionError).code === PERMISSION_DENIED;
    return denied
      ? {
          place: null,
          message:
            'Location access is blocked for this site. Allow it in your browser’s site settings, or search for your city.',
        }
      : fromNetwork();
  }
  try {
    const place = await api.locate({ lat: coords.latitude, lon: coords.longitude });
    return { place, message: `Found you: ${place.name}.` };
  } catch {
    return fromNetwork();
  }
}
