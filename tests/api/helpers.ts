let ip = 0;

/** A same-origin JSON POST from a fresh client address, so rate limits never leak between tests. */
export function post(path: string, body: unknown, headers: Record<string, string> = {}): Request {
  ip += 1;
  return new Request(`https://breathewise.test/api/${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-real-ip': `10.0.0.${String(ip)}`,
      ...headers,
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

/** Open-Meteo response bodies, loosely typed so tests can blank out series. */
export interface Payloads {
  air: {
    timezone: string;
    current: { time: string };
    hourly: { time: string[]; us_aqi: (number | null)[]; pm2_5: (number | null)[] } & Record<
      string,
      unknown
    >;
  };
  weather: { hourly: { time: string[]; boundary_layer_height: number[] } };
}

/** Open-Meteo-shaped payloads for one day with a night-time inversion. */
export function openMeteoPayloads(): Payloads {
  const time = Array.from(
    { length: 24 },
    (_, hour) => `2026-11-20T${String(hour).padStart(2, '0')}:00`,
  );
  const pm25 = time.map((_, hour) => (hour < 10 ? 150 : 40));
  return {
    air: {
      timezone: 'Asia/Kolkata',
      current: { time: '2026-11-20T07:30' },
      hourly: {
        time,
        us_aqi: pm25.map((value, hour) => (hour === 23 ? null : value * 1.4)),
        pm2_5: pm25,
        pm10: pm25.map((value) => value * 1.5),
        nitrogen_dioxide: pm25.map(() => 30),
        ozone: pm25.map(() => null),
      },
    },
    weather: {
      hourly: {
        time: time.slice(0, 12),
        boundary_layer_height: time.slice(0, 12).map((_, hour) => (hour < 10 ? 120 : 900)),
      },
    },
  };
}

/** Routes Open-Meteo URLs to canned payloads. */
export function fakeOpenMeteo(
  payloads = openMeteoPayloads(),
): (input: string | URL | Request) => Promise<Response> {
  return (input) => {
    const url = input instanceof Request ? input.url : input.toString();
    if (url.includes('air-quality-api')) return Promise.resolve(Response.json(payloads.air));
    if (url.includes('geocoding-api')) {
      return Promise.resolve(
        Response.json({
          results: [
            { name: 'Delhi', latitude: 28.65, longitude: 77.23, admin1: 'Delhi', country: 'India' },
          ],
        }),
      );
    }
    return Promise.resolve(Response.json(payloads.weather));
  };
}
