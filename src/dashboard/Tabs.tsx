import {
  type ReactElement,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import styles from './dashboard.module.css';

/** One tab and its panel. */
export interface TabSpec {
  id: string;
  label: string;
  panel: ReactNode;
}

/**
 * WAI-ARIA tabs with roving focus: Left/Right/Home/End move between tabs, and only the
 * selected tab is in the Tab order.
 */
export function Tabs({ tabs, label }: { tabs: readonly TabSpec[]; label: string }): ReactElement {
  const [selected, setSelected] = useState(0);
  const prefix = useId();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  const select = (index: number) => {
    const next = (index + tabs.length) % tabs.length;
    setSelected(next);
    buttons.current[next]?.focus();
  };
  const onKeyDown = (event: KeyboardEvent) => {
    const moves: Record<string, number> = {
      ArrowRight: selected + 1,
      ArrowLeft: selected - 1,
      Home: 0,
      End: tabs.length - 1,
    };
    const target = moves[event.key];
    if (target === undefined) return;
    event.preventDefault();
    select(target);
  };

  return (
    <div className={styles['tabs']}>
      <div role="tablist" aria-label={label} className={styles['tablist']}>
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={(element) => {
              buttons.current[index] = element;
            }}
            type="button"
            role="tab"
            id={`${prefix}-tab-${tab.id}`}
            aria-selected={index === selected}
            aria-controls={`${prefix}-panel-${tab.id}`}
            tabIndex={index === selected ? 0 : -1}
            onKeyDown={onKeyDown}
            onClick={() => {
              select(index);
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab, index) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${prefix}-panel-${tab.id}`}
          aria-labelledby={`${prefix}-tab-${tab.id}`}
          hidden={index !== selected}
          tabIndex={0}
          className={styles['panel']}
        >
          {index === selected ? tab.panel : null}
        </div>
      ))}
    </div>
  );
}
