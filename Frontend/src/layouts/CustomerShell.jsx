import { NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useCart } from "../context/CartContext";
import { endSession } from "../store/authSlice";

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
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((s) => s.auth.user);

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
    <div className="mx-auto min-h-screen w-full max-w-md bg-paper pb-24 lg:max-w-4xl lg:pb-12 xl:max-w-5xl">
      <header className="border-b border-line px-5 py-5 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] text-ink">Qrenza</p>
            <p className="text-xl font-semibold text-ink">Your table, your card</p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Phones get the bottom bar, wider screens get the same links up here. */}
            {code ? (
              <nav className="hidden flex-wrap items-center gap-1 lg:flex">
                {links.map(([path, label]) => (
                  <NavLink
                    key={label}
                    to={to(path)}
                    end={!path}
                    className={({ isActive }) =>
                      `rounded-full px-3 py-1.5 text-sm ${isActive ? "bg-purple text-white" : "text-ink hover:bg-raised"}`
                    }
                  >
                    {label}
                    {count(path)}
                  </NavLink>
                ))}
              </nav>
            ) : null}
            <button
              onClick={signOut}
              className="rounded-full border border-line px-3 py-1.5 text-sm text-ink hover:bg-raised"
            >
              {user?.phone ? `Sign out · ${user.phone.slice(-4)}` : "Sign out"}
            </button>
          </div>
        </div>
      </header>

      <main className="p-4 lg:p-8">
        <Outlet />
      </main>

      {code ? (
        <nav className="fixed bottom-0 left-0 right-0 mx-auto flex max-w-md gap-5 overflow-x-auto border-t border-line bg-panel px-4 py-3 text-xs lg:hidden">
          {links.map(([path, label]) => (
            <NavLink
              key={label}
              to={to(path)}
              end={!path}
              className={({ isActive }) => (isActive ? "whitespace-nowrap font-semibold text-ink" : "whitespace-nowrap text-muted")}
            >
              {label}
              {count(path)}
            </NavLink>
          ))}
        </nav>
      ) : null}
    </div>
  );
}
