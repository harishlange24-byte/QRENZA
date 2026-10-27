import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { endSession } from "../store/authSlice";
import { Button } from "./ui";

function MenuIcon({ open }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
    </svg>
  );
}

export default function SiteHeader() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector((s) => s.auth.user);
  const isShopSide = ["MERCHANT", "STAFF", "SUPER_ADMIN"].includes(user?.role);
  const [open, setOpen] = useState(false);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock the page while the phone sheet is open so nothing scrolls behind it.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const links = [
    { to: "/", label: "Home", end: true },
    user && !isShopSide ? { to: "/shops", label: "Shops" } : null,
    { to: "/pricing", label: "Pricing" },
    user?.role === "SUPER_ADMIN" ? { to: "/admin", label: "Admin" } : null
  ].filter(Boolean);

  const desk =
    user?.role === "MERCHANT" || user?.role === "SUPER_ADMIN"
      ? { to: "/merchant", label: "Dashboard" }
      : { to: "/merchant/onboard", label: "For shops" };

  const close = () => setOpen(false);

  // The walkthrough lives on the home page, so from anywhere else we go home
  // first and let that page do the scrolling.
  function goHow() {
    close();
    if (location.pathname === "/") {
      document.getElementById("how")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    navigate("/#how");
  }

  // A signed in visitor needs a way out, so the Login link turns into Logout.
  function signOut() {
    close();
    dispatch(endSession());
    navigate("/");
  }

  return (
    <>
      <div className="bg-[linear-gradient(90deg,#3b0f8f,#6d28d9_45%,#8b5cf6)] px-4 py-2 text-center text-[11px] font-medium tracking-wide text-white/90">
        Scan a QR, keep the guest. Stamps, queue and menu — no app to install.
      </div>

      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          stuck ? "q-glass border-b border-line shadow-soft" : "border-b border-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3">
          <Link to="/" className="group flex items-center gap-2.5" onClick={close}>
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[linear-gradient(135deg,#3b0f8f,#6d28d9_60%,#a78bfa)] text-sm font-bold text-white shadow-glow transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3">
              Q
            </span>
            <span className="text-lg font-semibold tracking-tight text-ink">
              Qren<span className="q-gradient-text">za</span>
            </span>
          </Link>

          {/* Wide screens keep every link out in the open. */}
          <nav className="hidden items-center gap-7 text-sm text-ink md:flex">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className="q-link py-1 font-medium transition-colors hover:text-purple"
              >
                {({ isActive }) => <span data-active={isActive}>{link.label}</span>}
              </NavLink>
            ))}
            <button className="q-link py-1 font-medium transition-colors hover:text-purple" onClick={goHow}>
              How it works
            </button>
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            {user?.role === "SUPER_ADMIN" ? null : (
              <Link to="/admin/login">
                <Button variant="outline" size="sm">Admin</Button>
              </Link>
            )}
            <Link to={desk.to}>
              <Button size="sm">{desk.label}</Button>
            </Link>
            {user ? (
              <Button variant="quiet" size="sm" onClick={signOut}>Logout</Button>
            ) : (
              <Link to="/login" className="q-link ml-1 text-sm font-medium text-ink hover:text-purple">Login</Link>
            )}
          </div>

          {/* Phones and small tablets collapse the same links behind this button. */}
          <button
            aria-label="Toggle menu"
            aria-expanded={open}
            className="rounded-2xl border border-line bg-panel p-2.5 text-ink shadow-soft transition-colors hover:border-purple hover:text-purple md:hidden"
            onClick={() => setOpen((value) => !value)}
          >
            <MenuIcon open={open} />
          </button>
        </div>
      </header>

      {open ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button aria-label="Close menu" className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={close} />
          <nav className="q-fade-up absolute inset-x-3 top-3 grid gap-1 rounded-4xl border border-line bg-panel p-4 shadow-lift">
            <div className="mb-2 flex items-center justify-between px-2">
              <span className="text-xs font-semibold uppercase tracking-[0.24em] text-purple">Menu</span>
              <button className="text-sm text-muted" onClick={close}>Close</button>
            </div>

            {links.map((link, index) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                onClick={close}
                style={{ animationDelay: `${index * 45}ms` }}
                className={({ isActive }) =>
                  `q-fade-up rounded-2xl px-4 py-3 text-sm font-medium transition-colors ${
                    isActive ? "bg-lavender text-purple" : "text-ink hover:bg-raised"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}

            <button
              onClick={goHow}
              style={{ animationDelay: `${links.length * 45}ms` }}
              className="q-fade-up rounded-2xl px-4 py-3 text-left text-sm font-medium text-ink transition-colors hover:bg-raised"
            >
              How it works
            </button>

            <Link to={desk.to} onClick={close} className="mt-2">
              <Button className="w-full">{desk.label}</Button>
            </Link>

            {user?.role === "SUPER_ADMIN" ? null : (
              <Link to="/admin/login" onClick={close} className="mt-1">
                <Button variant="ghost" className="w-full">Admin console</Button>
              </Link>
            )}

            {user ? (
              <Button variant="quiet" className="mt-1 w-full" onClick={signOut}>Logout · {user.phone?.slice(-4)}</Button>
            ) : (
              <Link to="/login" onClick={close} className="mt-1">
                <Button variant="ghost" className="w-full">Login with phone</Button>
              </Link>
            )}
          </nav>
        </div>
      ) : null}
    </>
  );
}
