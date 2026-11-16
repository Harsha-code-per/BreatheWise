import { type ReactElement, lazy, Suspense } from 'react';
import { useRoute } from './navigation.js';

const Landing = lazy(() =>
  import('../landing/Landing.js').then((module) => ({ default: module.Landing })),
);
const Dashboard = lazy(() =>
  import('../dashboard/Dashboard.js').then((module) => ({ default: module.Dashboard })),
);

/** Root component: the landing page at `/`, the assistant at `/app`. Each loads on demand. */
export function App(): ReactElement {
  const route = useRoute();
  return (
    <Suspense
      fallback={
        <p role="status" className="visually-hidden">
          Loading BreatheWise
        </p>
      }
    >
      {route === 'app' ? <Dashboard /> : <Landing />}
    </Suspense>
  );
}
