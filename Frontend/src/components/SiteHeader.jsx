import { Link } from "react-router-dom";
import { useSelector } from "react-redux";

export default function SiteHeader() {
  const user = useSelector((s) => s.auth.user);
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
      <Link to="/" className="flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-2xl bg-purple text-sm font-bold text-white">Q</span>
        <span className="text-lg font-semibold text-ink">Qrenza</span>
      </Link>
      <nav className="flex items-center gap-4 text-sm text-ink">
        <Link to="/pricing">Pricing</Link>
        {user?.role === "SUPER_ADMIN" ? <Link to="/admin">Admin</Link> : null}
        {user?.role === "MERCHANT" || user?.role === "SUPER_ADMIN" ? (
          <Link to="/merchant" className="rounded-full bg-purple px-3 py-1.5 text-white">Dashboard</Link>
        ) : (
          <Link to="/merchant/onboard" className="rounded-full bg-purple px-3 py-1.5 text-white">For shops</Link>
        )}
        {user?.role === "SUPER_ADMIN" ? null : (
          <Link to="/admin/login" className="rounded-full border border-line px-3 py-1.5 text-ink">Admin</Link>
        )}
        <Link to="/login">Login</Link>
      </nav>
    </header>
  );
}
