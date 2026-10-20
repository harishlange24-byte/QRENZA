import { createContext, useContext, useEffect, useMemo, useState } from "react";

const CartContext = createContext(null);
const KEY = "qrenzaCart";

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || { code: "", lines: [] };
  } catch {
    return { code: "", lines: [] };
  }
}

// The cart lives in the browser only. The server re-prices every line from the
// menu, so a tampered price here can never change what is actually charged.
export function CartProvider({ children }) {
  const [cart, setCart] = useState(read);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(cart));
  }, [cart]);

  // Scanning a different store starts a fresh cart.
  function linesFor(code, current) {
    return current.code === code ? current.lines : [];
  }

  function add(code, item) {
    setCart((current) => {
      const lines = linesFor(code, current);
      const found = lines.find((l) => l.itemId === item.itemId);
      const next = found
        ? lines.map((l) => (l.itemId === item.itemId ? { ...l, quantity: l.quantity + 1 } : l))
        : [...lines, { itemId: item.itemId, name: item.name, price: item.price, quantity: 1 }];
      return { code, lines: next };
    });
  }

  function setQty(code, itemId, quantity) {
    setCart((current) => {
      const lines = linesFor(code, current)
        .map((l) => (l.itemId === itemId ? { ...l, quantity: Math.max(0, Math.min(quantity, 20)) } : l))
        .filter((l) => l.quantity > 0);
      return { code, lines };
    });
  }

  function remove(code, itemId) {
    setCart((current) => ({ code, lines: linesFor(code, current).filter((l) => l.itemId !== itemId) }));
  }

  function clear() {
    setCart({ code: "", lines: [] });
  }

  const value = useMemo(() => {
    const lines = cart.lines;
    return {
      code: cart.code,
      lines,
      count: lines.reduce((sum, l) => sum + l.quantity, 0),
      subtotal: lines.reduce((sum, l) => sum + l.price * l.quantity, 0),
      add,
      setQty,
      remove,
      clear
    };
  }, [cart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
