import { NavLink, Outlet, useParams } from "react-router-dom";
import { useCart } from "../context/CartContext";

const links = [
  ["", "Home"],
  ["menu", "Menu"],
  ["cart", "Cart"],
  ["orders", "Orders"],
  ["gift-cards", "Gift"],
  ["loyalty", "Stamps"],
  ["queue", "Queue"],
  ["feedback", "Rate"]
];

export default function CustomerShell() {
  const { code } = useParams();
  const cart = useCart();
  return (
    <div className="mx-auto min-h-screen max-w-md bg-paper pb-24">
      <header className="border-b border-line px-5 py-5">
        <p className="text-[11px] uppercase tracking-[0.25em] text-ink">Qrenza</p>
        <p className="text-xl font-semibold text-ink">Your table, your card</p>
      </header>
      <main className="p-4">
        <Outlet />
      </main>
      {code ? (
        <nav className="fixed bottom-0 left-0 right-0 mx-auto flex max-w-md gap-5 overflow-x-auto border-t border-line bg-panel px-4 py-3 text-xs">
          {links.map(([path, label]) => (
            <NavLink
              key={label}
              to={path ? `/s/${code}/${path}` : `/s/${code}`}
              end={!path}
              className={({ isActive }) => (isActive ? "whitespace-nowrap font-semibold text-ink" : "whitespace-nowrap text-muted")}
            >
              {label}
              {path === "cart" && cart.code === code && cart.count > 0 ? ` (${cart.count})` : ""}
            </NavLink>
          ))}
        </nav>
      ) : null}
    </div>
  );
}
