import * as React from 'react';

/**
 * Closes on: a document-level mousedown whose target isn't inside any of `exemptRefs`, a
 * scroll anywhere on the page (capture:true — element scroll doesn't bubble but capture still
 * runs top-down through every ancestor), or a window resize. Position in both Menu.tsx and
 * SelectMenu.tsx is captured once at open time, not live-tracked, so scroll/resize must close
 * rather than silently go stale.
 *
 * Escape (and, for SelectMenu, Tab) are deliberately NOT handled here — they differ in real,
 * non-mergeable ways between the two current callers (document-level vs. listbox-scoped,
 * whether they also refocus a trigger).
 */
export function useDismissOnOutsideOrInvalidate(
  active: boolean,
  onDismiss: () => void,
  exemptRefs: Array<React.RefObject<HTMLElement | null> | undefined>,
) {
  React.useEffect(() => {
    if (!active) return;
    const away = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideExempt = exemptRefs.some((r) => r?.current && r.current.contains(target));
      if (!insideExempt) onDismiss();
    };
    const onInvalidate = () => onDismiss();
    document.addEventListener('mousedown', away);
    document.addEventListener('scroll', onInvalidate, true);
    window.addEventListener('resize', onInvalidate);
    return () => {
      document.removeEventListener('mousedown', away);
      document.removeEventListener('scroll', onInvalidate, true);
      window.removeEventListener('resize', onInvalidate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- exemptRefs is a fresh array
    // literal from the caller every render; the ref objects themselves are stable and read
    // fresh (`.current`) inside the handler at event-fire time, not captured here, so including
    // the array would tear down/reattach on every unrelated re-render.
  }, [active, onDismiss]);
}
