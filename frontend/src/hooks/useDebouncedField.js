import { useEffect, useRef, useState } from 'react';

/**
 * Local draft state for a text input whose committed value lives elsewhere (e.g. the URL).
 * The draft follows external changes to `value` and calls `onCommit` after `delay` ms of inactivity.
 */
export function useDebouncedField(value, onCommit, delay = 400) {
  const [draft, setDraft] = useState(value);
  const [prevValue, setPrevValue] = useState(value);
  const commitRef = useRef(onCommit);

  useEffect(() => {
    commitRef.current = onCommit;
  });

  if (value !== prevValue) {
    setPrevValue(value);
    setDraft(value);
  }

  useEffect(() => {
    if (draft === value) return undefined;
    const t = setTimeout(() => commitRef.current(draft), delay);
    return () => clearTimeout(t);
  }, [draft, value, delay]);

  return [draft, setDraft];
}
