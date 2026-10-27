import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { AccessProvider, useAccess } from "../context/AccessContext";
import { MerchantStoreProvider, useMerchantStore } from "../context/MerchantStoreContext";
import { Icon } from "../components/icons";
import { Alert, inputClass } from "../components/ui";
import { endSession } from "../store/authSlice";

// The last column is the plan feature that unlocks the screen. It is the same
// code the backend checks, so the badge can never disagree with the API.
const links = [
  ["/merchant", "Home", "", "home"],
  ["/merchant/stores", "Stores", "", "store"],
  ["/merchant/menu", "Menu", "AI_MENU", "list"],
  ["/merchant/loyalty", "Loyalty", "DIGITAL_STAMPS", "stamp"],
  ["/merchant/queue", "Queue", "QR_QUEUE", "queue"],
  ["/merchant/orders", "Orders", "ONLINE_ORDERING", "bag"],
  ["/merchant/gift-cards", "Gift cards", "DIGITAL_STAMPS", "gift"],
  ["/merchant/supplies", "Supplies", "", "box"],
  ["/merchant/rewards", "Rewards", "DIGITAL_STAMPS", "reward"],
  ["/merchant/feedback", "Feedback", "FEEDBACK_INBOX", "chat"],
  ["/merchant/crm", "CRM", "CUSTOMER_CRM", "users"],
  ["/merchant/analytics", "Analytics", "ANALYTICS", "chart"],
  ["/merchant/billing", "Billing", "", "card"]
];

export default function MerchantShell() {
  return (
    <MerchantStoreProvider>
      <AccessProvider>
        <ShellInner />
      </AccessProvider>
    </MerchantStoreProvider>
  );
}

function ShellInner() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((s) => s.auth.user);
  const { storeId, setStoreId, stores } = useMerchantStore();
  const { access } = useAccess();

  // Two separate flags: a drawer for phones and a collapse for the desk layout.
  const [drawer, setDrawer] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    document.body.style.overflow = drawer ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawer]);

  const planLocked = Boolean(access) && (!access.hasPlan || !access.isUsable);
  const isLocked = (feature) => Boolean(access) && !planLocked && !(access.features || []).includes(feature);

  function signOut() {
    dispatch(endSession());
    navigate("/");
  }

  return (
    <div className="min-h-screen bg-paper">
      {drawer ? (
        <button
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-deep/40 backdrop-blur-sm md:hidden"
          onClick={() => setDrawer(false)}
        />
      ) : null}

      <div className={`md:grid ${collapsed ? "md:grid-cols-[84px_1fr]" : "md:grid-cols-[272px_1fr]"}`}>
        <aside
          className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col gap-4 overflow-y-auto border-r border-line bg-panel px-4 py-5 shadow-lift transition-transform duration-300 md:sticky md:top-0 md:h-screen md:translate-x-0 md:shadow-none ${
            drawer ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-deep via-purple to-lilac text-base font-black text-white shadow-glow">
              Q
            </span>
            <div className={`min-w-0 ${collapsed ? "md:hidden" : ""}`}>
              <p className="truncate text-sm font-bold text-ink">Qrenza</p>
              <p className="truncate text-[11px] text-muted">{user?.phone || "Merchant desk"}</p>
            </div>
            <button
              aria-label="Close menu"
              className="ml-auto rounded-xl p-1.5 text-muted transition hover:bg-raised hover:text-ink md:hidden"
              onClick={() => setDrawer(false)}
            >
              <Icon name="close" className="h-4 w-4" />
            </button>
          </div>

          {/* Store picker only makes sense while the rail is wide, so it folds away. */}
          <div className={collapsed ? "md:hidden" : ""}>
            {stores.length ? (
              <select className={inputClass} value={storeId} onChange={(e) => setStoreId(e.target.value)}>
                <option value="">Select store</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            ) : (
              <input
                className={inputClass}
                placeholder="Active store ID"
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
              />
            )}
          </div>

          <nav className="flex flex-1 flex-col gap-1.5">
            {links.map(([to, label, feature, icon]) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/merchant"}
                title={label}
                onClick={() => setDrawer(false)}
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
                    {feature && isLocked(feature) ? (
                      <span className={`ml-auto shrink-0 rounded-full bg-lavender px-2 py-0.5 text-[10px] font-bold uppercase text-ink ${collapsed ? "md:hidden" : ""}`}>
                        Locked
                      </span>
                    ) : null}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto space-y-2">
            {user?.role === "SUPER_ADMIN" ? (
              <NavLink
                to="/admin"
                title="Super admin"
                className={`flex items-center gap-3 rounded-2xl border border-line px-3 py-2.5 text-sm font-medium text-ink-soft transition hover:bg-raised hover:text-ink ${
                  collapsed ? "md:justify-center md:px-0" : ""
                }`}
              >
                <Icon name="shield" className="h-5 w-5 shrink-0 text-purple" />
                <span className={`truncate ${collapsed ? "md:hidden" : ""}`}>Super admin</span>
              </NavLink>
            ) : null}
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
                onClick={() => setDrawer(true)}
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
                <p className="truncate text-sm font-semibold text-ink">Merchant desk</p>
                <p className="truncate text-[11px] text-muted">
                  {stores.find((s) => s.id === storeId)?.name || "No store selected"}
                </p>
              </div>
              <Link
                to="/"
                className="ml-auto hidden items-center gap-2 rounded-full border border-line bg-panel px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:bg-raised hover:text-ink sm:inline-flex"
              >
                <Icon name="store" className="h-4 w-4 text-purple" />
                View site
              </Link>
            </div>
          </header>

          <main className="min-w-0 space-y-4 p-4 md:p-8">
            {planLocked ? (
              <Alert>
                {access.messages?.[0] || "Your plan is not active."}{" "}
                <Link to="/merchant/billing" className="font-semibold underline">Choose a plan</Link>
              </Alert>
            ) : null}
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
