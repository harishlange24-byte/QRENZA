import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Icon } from "../components/icons";
import { useCart } from "../context/CartContext";
import { endSession } from "../store/authSlice";

const links = [
  ["", "Home", "home"],
  ["menu", "Menu", "list"],
  ["cart", "Cart", "cart"],
  ["orders", "Orders", "bag"],
  ["gift-cards", "Gift", "gift"],
  ["loyalty", "Stamps", "stamp"],
  ["queue", "Queue", "queue"],
  ["feedback", "Rate", "chat"]
];

export default function CustomerShell() {
  const { code } = useParams();
  const cart = useCart();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((s) => s.auth.user);

  // Phones get a slide-down sheet so the header stays one line tall.
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const to = (path) => (path ? `/s/${code}/${path}` : `/s/${code}`);
  const count = (path) =>
    path === "cart" && cart.code === code && cart.count > 0 ? ` (${cart.count})` : "";

  // The phone and the website share one session, so the customer needs a way
  // to end it from inside the shop too.
  function signOut() {
    dispatch(endSession());
    navigate("/login");
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-paper pb-24 lg:max-w-5xl lg:pb-12">
      <header className="sticky top-0 z-30 border-b border-line bg-panel/85 backdrop-blur-xl">
        <div className="flex items-center gap-3 px-4 py-3 lg:px-8">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-deep via-purple to-lilac text-sm font-black text-white shadow-glow">
            Q
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-ink">Your table, your card</p>
            <p className="truncate text-[11px] text-muted">
              {user?.phone ? `Signed in · ${user.phone.slice(-4)}` : "Qrenza"}
            </p>
          </div>

          {/* Wider screens keep every link in the header. */}
          {code ? (
            <nav className="ml-auto hidden flex-wrap items-center gap-1 lg:flex">
              {links.map(([path, label, icon]) => (
                <NavLink
                  key={label}
                  to={to(path)}
                  end={!path}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                      isActive ? "bg-gradient-to-r from-deep via-purple to-lilac text-white shadow-glow" : "text-ink-soft hover:bg-raised hover:text-ink"
                    }`
                  }
                >
                  <Icon name={icon} className="h-4 w-4" />
                  {label}
                  {count(path)}
                </NavLink>
              ))}
            </nav>
          ) : null}

          <button
            onClick={signOut}
            className="ml-auto hidden rounded-full border border-line px-3 py-1.5 text-sm font-medium text-ink-soft transition hover:bg-raised hover:text-ink lg:ml-0 lg:inline-flex"
          >
            Sign out
          </button>

          {code ? (
            <button
              aria-label="Toggle menu"
              className="ml-auto rounded-xl border border-line bg-panel p-2 text-ink transition hover:bg-raised active:scale-95 lg:hidden"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <Icon name={menuOpen ? "close" : "menu"} className="h-5 w-5" />
            </button>
          ) : null}
        </div>

        {code && menuOpen ? (
          <div className="border-t border-line px-4 py-3 lg:hidden">
            <div className="grid grid-cols-2 gap-2">
              {links.map(([path, label, icon]) => (
                <NavLink
                  key={label}
                  to={to(path)}
                  end={!path}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-sm font-medium transition ${
                      isActive ? "border-transparent bg-gradient-to-r from-deep via-purple to-lilac text-white shadow-glow" : "border-line text-ink-soft hover:bg-raised hover:text-ink"
                    }`
                  }
                >
                  <Icon name={icon} className="h-4 w-4" />
                  {label}
                  {count(path)}
                </NavLink>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Link
                to="/shops"
                onClick={() => setMenuOpen(false)}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-line px-3 py-2.5 text-sm font-medium text-ink-soft transition hover:bg-raised hover:text-ink"
              >
                <Icon name="store" className="h-4 w-4 text-purple" />
                All shops
              </Link>
              <button
                onClick={signOut}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-raised px-3 py-2.5 text-sm font-medium text-ink transition hover:bg-line"
              >
                <Icon name="logout" className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        ) : null}
      </header>

      <main className="p-4 lg:p-8">
        <Outlet />
      </main>

      {code ? (
        <nav className="fixed bottom-0 left-0 right-0 z-30 mx-auto flex max-w-md gap-2 overflow-x-auto border-t border-line bg-panel/90 px-3 py-2 backdrop-blur-xl lg:hidden">
          {links.map(([path, label, icon]) => (
            <NavLink
              key={label}
              to={to(path)}
              end={!path}
              className={({ isActive }) =>
                `flex min-w-[64px] flex-col items-center gap-1 rounded-2xl px-2 py-1.5 text-[10px] font-medium transition ${
                  isActive ? "bg-raised text-purple" : "text-muted hover:text-ink"
                }`
              }
            >
              <Icon name={icon} className="h-5 w-5" />
              <span className="whitespace-nowrap">
                {label}
                {count(path)}
              </span>
            </NavLink>
          ))}
        </nav>
      ) : null}
    </div>
  );
}
