import { useEffect, useState } from 'react';

const DEBOUNCE_DELAY = 500;

export const useDebounce = <T>(value: T, delay = DEBOUNCE_DELAY) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debounced;
};
