import { useState, useEffect } from 'react';

/**
 * Client-side hook to check if the dev access cookie exists.
 * This is NOT a security check — the real validation happens server-side.
 * This just controls which UI to render.
 */
export function useDevAccess() {
  const [hasDev, setHasDev] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // cx_dev_access is httpOnly so we can't read it directly.
    // Instead, check via a lightweight API call.
    fetch('/api/dev-access/check', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => setHasDev(!!data.valid))
      .catch(() => setHasDev(false))
      .finally(() => setLoading(false));
  }, []);

  return { hasDev, loading };
}
