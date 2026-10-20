import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getMySubscription } from "../api/billing";

// The merchant's plan access is resolved by the backend, never guessed here.
// Pages read it to show locked features; every paid API is still gated server side.
const AccessContext = createContext({ access: null, ready: false, reload: () => {} });

export function AccessProvider({ children }) {
  const [access, setAccess] = useState(null);
  const [ready, setReady] = useState(false);

  function reload() {
    return getMySubscription()
      .then(({ data }) => setAccess(data.access || null))
      .catch(() => setAccess(null))
      .finally(() => setReady(true));
  }

  useEffect(() => {
    reload();
  }, []);

  const value = useMemo(() => ({ access, ready, reload }), [access, ready]);

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAccess() {
  return useContext(AccessContext);
}
