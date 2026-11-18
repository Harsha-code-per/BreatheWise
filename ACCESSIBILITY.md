# Accessibility

Target: **WCAG 2.2 AA**, verified automatically on every push and by a keyboard-only end-to-end journey.

| Need            | How BreatheWise meets it                                                                                                                                                                                                                             |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Structure       | Landmarks (`header`, `main`, `footer`), one `h1` per page, and an ordered heading outline. A skip link is the first focusable element.                                                                                                               |
| Keyboard        | Every control is a native button, link or input. Tabs follow the WAI-ARIA pattern (arrows, Home and End, roving `tabindex`). Focus rings are visible (3 px, AA contrast).                                                                            |
| Focus           | Focus never falls back to the page: changing, saving or forgetting the family moves it to `<main>`, adding a person moves it to their name, and removing one moves it to "Add a family member". After in-app navigation, `<main>` takes focus.       |
| Forms           | Every input has a `<label>`, and groups use `fieldset` and `legend`. Hints are linked with `aria-describedby`. On submit, an error summary takes focus; each problem is a link that moves focus to its input, and that input carries `aria-invalid`. |
| Dynamic content | `role="status"` for search results, briefing authorship and sharing. `role="log"` for the Ask conversation. `aria-busy` while the briefing loads.                                                                                                    |
| Colour          | The AQI level is always written as text. Colour bands are decoration on top. Both themes pass AA contrast, and axe checks contrast in e2e.                                                                                                           |
| Charts          | The hourly chart is hidden from assistive tech and has a "Show as a table" alternative. Landing figures have text captions.                                                                                                                          |
| Motion          | `prefers-reduced-motion` turns off the haze animation and View Transitions. The WebGL sky renders a still frame.                                                                                                                                     |
| Text            | Relative units, a 100–200% zoom-safe layout down to 320 px, and lines kept under about 70 characters.                                                                                                                                                |
| Language        | `lang="en"` on the page. AI explanations come in English, Hindi, Bengali, Marathi or Tamil.                                                                                                                                                          |

## Automated checks

- `tests/ui/*.test.tsx`: axe-core on the landing page, dashboard and setup form in jsdom.
- `e2e/app.spec.ts`: axe with WCAG 2.0/2.1/2.2 A and AA tags, including colour contrast. It runs in light and dark
  themes on desktop and on a Pixel 7, and includes a keyboard-only journey.
- `eslint-plugin-jsx-a11y` (strict) on all components.
