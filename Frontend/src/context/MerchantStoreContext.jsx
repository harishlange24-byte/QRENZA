import { createContext, useContext, useMemo, useState } from "react";

const MerchantStoreContext = createContext(null);

function readStores() {
  try {
    return JSON.parse(localStorage.getItem("qrenzaStores") || "[]");
  } catch {
    return [];
  }
}

export function MerchantStoreProvider({ children }) {
  const [storeId, setStoreId] = useState(() => localStorage.getItem("qrenzaStoreId") || "");
  const [stores, setStores] = useState(readStores);

  function saveId(id) {
    setStoreId(id);
    localStorage.setItem("qrenzaStoreId", id);
  }

  function upsertStore(store) {
    const id = store.id || store._id;
    const next = [{ id, name: store.name }, ...stores.filter((s) => s.id !== id)];
    setStores(next);
    localStorage.setItem("qrenzaStores", JSON.stringify(next));
    saveId(id);
  }

  const value = useMemo(
    () => ({ storeId, setStoreId: saveId, stores, upsertStore }),
    [storeId, stores]
  );
  return <MerchantStoreContext.Provider value={value}>{children}</MerchantStoreContext.Provider>;
}

export function useMerchantStore() {
  const ctx = useContext(MerchantStoreContext);
  if (!ctx) throw new Error("Merchant store context missing");
  return ctx;
}
