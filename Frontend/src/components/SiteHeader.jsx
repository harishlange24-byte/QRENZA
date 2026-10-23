import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { endSession } from "../store/authSlice";

export default function SiteHeader() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((s) => s.auth.user);
  const isShopSide = ["MERCHANT", "STAFF", "SUPER_ADMIN"].includes(user?.role);
  const [open, setOpen] = useState(false);

  const links = [
    user && !isShopSide ? { to: "/shops", label: "Shops" } : null,
    { to: "/pricing", label: "Pricing" },
    user?.role === "SUPER_ADMIN" ? { to: "/admin", label: "Admin" } : null
  ].filter(Boolean);

  const desk =
    user?.role === "MERCHANT" || user?.role === "SUPER_ADMIN"
      ? { to: "/merchant", label: "Dashboard" }
      : { to: "/merchant/onboard", label: "For shops" };

  const close = () => setOpen(false);

  // A signed in visitor needs a way out, so the Login link turns into Logout.
  function signOut() {
    close();
    dispatch(endSession());
    navigate("/");
  }

  return (
    <header className="mx-auto max-w-6xl px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-2xl bg-purple text-sm font-bold text-white">Q</span>
          <span className="text-lg font-semibold text-ink">Qrenza</span>
        </Link>

        {/* Wide screens keep every link out in the open. */}
        <nav className="hidden items-center gap-4 text-sm text-ink md:flex">
          {links.map((link) => (
            <Link key={link.to} to={link.to}>{link.label}</Link>
          ))}
          <Link to={desk.to} className="rounded-full bg-purple px-3 py-1.5 text-white">{desk.label}</Link>
          {user?.role === "SUPER_ADMIN" ? null : (
            <Link to="/admin/login" className="rounded-full border border-line px-3 py-1.5 text-ink">Admin</Link>
          )}
          {user ? (
            <button onClick={signOut} className="text-ink">Logout</button>
          ) : (
            <Link to="/login">Login</Link>
          )}
        </nav>

        {/* Phones and small tablets collapse the same links behind this button. */}
        <button
          aria-label="Toggle menu"
          aria-expanded={open}
          className="rounded-xl border border-line bg-panel p-2 text-ink md:hidden"
          onClick={() => setOpen((v) => !v)}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {open ? (
        <nav className="mt-3 grid gap-1 rounded-2xl border border-line bg-panel p-3 text-sm text-ink md:hidden">
          {links.map((link) => (
            <Link key={link.to} to={link.to} onClick={close} className="rounded-xl px-3 py-2 hover:bg-raised">
              {link.label}
            </Link>
          ))}
          <Link to={desk.to} onClick={close} className="rounded-xl bg-purple px-3 py-2 font-semibold text-white">
            {desk.label}
          </Link>
          {user?.role === "SUPER_ADMIN" ? null : (
            <Link to="/admin/login" onClick={close} className="rounded-xl border border-line px-3 py-2 text-ink">
              Admin
            </Link>
          )}
          {user ? (
            <button onClick={signOut} className="rounded-xl px-3 py-2 text-left text-ink hover:bg-raised">
              Logout
            </button>
          ) : (
            <Link to="/login" onClick={close} className="rounded-xl px-3 py-2 hover:bg-raised">
              Login
            </Link>
          )}
        </nav>
      ) : null}
    </header>
  );
}
