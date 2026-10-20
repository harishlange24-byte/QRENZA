import { createContext, useContext, useMemo, useState } from "react";

const VisitContext = createContext(null);

export function VisitProvider({ children }) {
  const [visit, setVisit] = useState({
    code: "",
    tableNumber: "",
    store: null,
    coords: null,
    gpsAllowed: false
  });

  const value = useMemo(() => ({ visit, setVisit }), [visit]);
  return <VisitContext.Provider value={value}>{children}</VisitContext.Provider>;
}

export function useVisit() {
  const ctx = useContext(VisitContext);
  if (!ctx) throw new Error("useVisit must be used inside VisitProvider");
  return ctx;
}
