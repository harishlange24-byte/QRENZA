import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { AccessProvider, useAccess } from "../context/AccessContext";
import { MerchantStoreProvider, useMerchantStore } from "../context/MerchantStoreContext";
import { Alert, inputClass } from "../components/ui";
import { endSession } from "../store/authSlice";

// The last column is the plan feature that unlocks the screen. It is the same
// code the backend checks, so the badge can never disagree with the API.
const links = [
  ["/merchant", "Home", ""],
  ["/merchant/stores", "Stores", ""],
  ["/merchant/menu", "Menu", "AI_MENU"],
  ["/merchant/loyalty", "Loyalty", "DIGITAL_STAMPS"],
  ["/merchant/queue", "Queue", "QR_QUEUE"],
  ["/merchant/orders", "Orders", "ONLINE_ORDERING"],
  ["/merchant/gift-cards", "Gift cards", "DIGITAL_STAMPS"],
  ["/merchant/supplies", "Supplies", ""],
  ["/merchant/rewards", "Rewards", "DIGITAL_STAMPS"],
  ["/merchant/feedback", "Feedback", "FEEDBACK_INBOX"],
  ["/merchant/crm", "CRM", "CUSTOMER_CRM"],
  ["/merchant/campaigns", "Campaigns", "WHATSAPP_CAMPAIGNS"],
  ["/merchant/analytics", "Analytics", "ANALYTICS"],
  ["/merchant/staff", "Staff", "STAFF_ACCOUNTS"],
  ["/merchant/billing", "Billing", ""]
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

  const planLocked = Boolean(access) && (!access.hasPlan || !access.isUsable);
  const isLocked = (feature) => Boolean(access) && !planLocked && !(access.features || []).includes(feature);

  return (
    <div className="min-h-screen bg-paper md:grid md:grid-cols-[240px_1fr]">
      <aside className="border-r border-line bg-panel p-4">
        <p className="text-lg font-semibold text-ink">Qrenza</p>
        <p className="mb-4 text-xs text-muted">{user?.phone}</p>
        {stores.length ? (
          <select className={`${inputClass} mb-3`} value={storeId} onChange={(e) => setStoreId(e.target.value)}>
            <option value="">Select store</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        ) : (
          <input
            className={`${inputClass} mb-3`}
            placeholder="Active store ID"
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
          />
        )}
        <nav className="grid gap-1 text-sm">
          {links.map(([to, label, feature]) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/merchant"}
              className={({ isActive }) => `flex items-center justify-between rounded-xl px-3 py-2 ${isActive ? "bg-purple text-white" : "text-ink"}`}
            >
              {label}
              {feature && isLocked(feature) ? (
                <span className="rounded-full bg-lavender px-2 py-0.5 text-[10px] font-semibold uppercase text-ink">Locked</span>
              ) : null}
            </NavLink>
          ))}
        </nav>
        {user?.role === "SUPER_ADMIN" ? (
          <Link to="/admin" className="mt-4 block text-xs text-purple">Super admin</Link>
        ) : null}
        <button className="mt-4 block text-xs text-muted" onClick={() => { dispatch(endSession()); navigate("/"); }}>Sign out</button>
      </aside>
      <main className="space-y-4 p-4 md:p-8">
        {planLocked ? (
          <div>
            <Alert>
              {access.messages?.[0] || "Your plan is not active."}{" "}
              <Link to="/merchant/billing" className="font-semibold">Choose a plan</Link>
            </Alert>
          </div>
        ) : null}
        <Outlet />
      </main>
    </div>
  );
}
