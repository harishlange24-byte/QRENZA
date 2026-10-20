import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logoutLocal } from "../store/authSlice";

const links = [
  ["/admin", "Overview"],
  ["/admin/merchants", "Merchants"],
  ["/admin/stores", "Stores"],
  ["/admin/users", "Users"],
  ["/admin/alerts", "Alerts"],
  ["/admin/audit-logs", "Audit logs"]
];

export default function AdminShell() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((s) => s.auth.user);

  return (
    <div className="min-h-screen bg-paper md:grid md:grid-cols-[240px_1fr]">
      <aside className="border-r border-line bg-panel p-4">
        <p className="text-lg font-semibold text-ink">Qrenza Admin</p>
        <p className="mb-4 text-xs text-muted">{user?.phone}</p>
        <nav className="grid gap-1 text-sm">
          {links.map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/admin"}
              className={({ isActive }) => `rounded-xl px-3 py-2 ${isActive ? "bg-purple text-white" : "text-ink"}`}
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <NavLink to="/merchant" className="mt-4 block text-xs text-purple">Merchant desk</NavLink>
        <button className="mt-4 block text-xs text-muted" onClick={() => { dispatch(logoutLocal()); navigate("/"); }}>Sign out</button>
      </aside>
      <main className="p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
