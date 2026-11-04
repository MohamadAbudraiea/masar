import { useSearchParams } from 'react-router-dom';
import { useCallback, useMemo } from 'react';

/**
 * Custom hook to sync filter, pagination, and search states with the URL query parameters.
 * Ensures the browser back/forward buttons seamlessly restore previous views.
 */
export function useUrlFilters(defaultFilters = {}) {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(() => {
    const current = { ...defaultFilters };
    for (const [key, value] of searchParams.entries()) {
      current[key] = value;
    }
    return current;
  }, [searchParams, defaultFilters]);

  const setFilter = useCallback(
    (key, value) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value === undefined || value === null || value === '' || value === 'all') {
            next.delete(key);
          } else {
            next.set(key, String(value));
          }
          // Reset to page 1 on filter changes if not changing page itself
          if (key !== 'page' && next.has('page')) {
            next.set('page', '1');
          }
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const setFilters = useCallback(
    (newFilters) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          Object.entries(newFilters).forEach(([key, value]) => {
            if (value === undefined || value === null || value === '' || value === 'all') {
              next.delete(key);
            } else {
              next.set(key, String(value));
            }
          });
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const resetFilters = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

  return {
    filters,
    setFilter,
    setFilters,
    resetFilters,
  };
}

