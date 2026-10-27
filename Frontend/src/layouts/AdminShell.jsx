import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Icon } from "../components/icons";
import { endSession } from "../store/authSlice";

const links = [
  ["/admin", "Overview", "grid"],
  ["/admin/merchants", "Merchants", "briefcase"],
  ["/admin/stores", "Stores", "store"],
  ["/admin/users", "Users", "users"],
  ["/admin/alerts", "Alerts", "bell"],
  ["/admin/audit-logs", "Audit logs", "file"]
];

export default function AdminShell() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((s) => s.auth.user);

  // `open` drives the phone drawer, `collapsed` shrinks the desk rail to icons.
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Stop the page behind the drawer from scrolling while it is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  function signOut() {
    dispatch(endSession());
    navigate("/");
  }

  return (
    <div className="min-h-screen bg-paper">
      {open ? (
        <button
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-deep/40 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <div className={`md:grid ${collapsed ? "md:grid-cols-[84px_1fr]" : "md:grid-cols-[272px_1fr]"}`}>
        <aside
          className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col gap-5 overflow-y-auto border-r border-line bg-panel px-4 py-5 shadow-lift transition-transform duration-300 md:sticky md:top-0 md:h-screen md:translate-x-0 md:shadow-none ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-deep via-purple to-lilac text-base font-black text-white shadow-glow">
              Q
            </span>
            <div className={`min-w-0 ${collapsed ? "md:hidden" : ""}`}>
              <p className="truncate text-sm font-bold text-ink">Qrenza</p>
              <p className="truncate text-[11px] text-muted">Admin console</p>
            </div>
            <button
              aria-label="Close menu"
              className="ml-auto rounded-xl p-1.5 text-muted transition hover:bg-raised hover:text-ink md:hidden"
              onClick={() => setOpen(false)}
            >
              <Icon name="close" className="h-4 w-4" />
            </button>
          </div>

          <div className={`flex items-center gap-2 rounded-2xl border border-line bg-raised/60 px-3 py-2 ${collapsed ? "md:hidden" : ""}`}>
            <span className="h-2 w-2 rounded-full bg-mint" />
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-ink">{user?.name || "Super admin"}</p>
              <p className="truncate text-[11px] text-muted">{user?.email || user?.phone}</p>
            </div>
          </div>

          <nav className="flex flex-1 flex-col gap-1.5">
            {links.map(([to, label, icon]) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/admin"}
                title={label}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                    collapsed ? "md:justify-center md:px-0" : ""
                  } ${
                    isActive
                      ? "bg-gradient-to-r from-deep via-purple to-lilac text-white shadow-glow"
                      : "text-ink-soft hover:translate-x-0.5 hover:bg-raised hover:text-ink"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon name={icon} className={`h-5 w-5 shrink-0 ${isActive ? "" : "text-purple"}`} />
                    <span className={`truncate ${collapsed ? "md:hidden" : ""}`}>{label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto space-y-2">
            <NavLink
              to="/merchant"
              title="Merchant desk"
              className={`flex items-center gap-3 rounded-2xl border border-line px-3 py-2.5 text-sm font-medium text-ink-soft transition hover:bg-raised hover:text-ink ${
                collapsed ? "md:justify-center md:px-0" : ""
              }`}
            >
              <Icon name="store" className="h-5 w-5 shrink-0 text-purple" />
              <span className={`truncate ${collapsed ? "md:hidden" : ""}`}>Merchant desk</span>
            </NavLink>
            <button
              onClick={signOut}
              title="Sign out"
              className={`flex w-full items-center gap-3 rounded-2xl bg-raised px-3 py-2.5 text-sm font-medium text-ink transition hover:bg-line ${
                collapsed ? "md:justify-center md:px-0" : ""
              }`}
            >
              <Icon name="logout" className="h-5 w-5 shrink-0" />
              <span className={`truncate ${collapsed ? "md:hidden" : ""}`}>Sign out</span>
            </button>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-30 border-b border-line bg-panel/80 backdrop-blur-xl">
            <div className="flex items-center gap-3 px-4 py-3 md:px-6">
              <button
                aria-label="Open menu"
                className="rounded-xl border border-line bg-panel p-2 text-ink transition hover:bg-raised active:scale-95 md:hidden"
                onClick={() => setOpen(true)}
              >
                <Icon name="menu" className="h-5 w-5" />
              </button>
              <button
                aria-label="Toggle sidebar"
                className="hidden rounded-xl border border-line bg-panel p-2 text-ink transition hover:bg-raised active:scale-95 md:inline-flex"
                onClick={() => setCollapsed((c) => !c)}
              >
                <Icon name={collapsed ? "chevron" : "menu"} className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">Platform overview</p>
                <p className="truncate text-[11px] text-muted">Everything across Qrenza</p>
              </div>
              <span className="ml-auto hidden items-center gap-2 rounded-full border border-line bg-panel px-3 py-1.5 text-xs font-medium text-ink-soft sm:inline-flex">
                <span className="h-2 w-2 animate-pulse rounded-full bg-mint" />
                Live
              </span>
            </div>
          </header>

          <main className="min-w-0 p-4 md:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
