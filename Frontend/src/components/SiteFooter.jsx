import { Link } from "react-router-dom";
import { Badge, Button, inputClass } from "./ui";
import { Icon } from "./icons";

const columns = [
  {
    title: "Product",
    links: [
      ["Why Qrenza", "/"],
      ["Pricing", "/pricing"],
      ["Phone login", "/login"]
    ]
  },
  {
    title: "For shops",
    links: [
      ["Create shop account", "/merchant/onboard"],
      ["Merchant desk", "/merchant"],
      ["QR supplies", "/merchant/supplies"]
    ]
  },
  {
    title: "Support",
    links: [
      ["support@qrenza.in", "mailto:support@qrenza.in"],
      ["Admin console", "/admin/login"]
    ]
  }
];

// Static, presentational social row. Nothing here talks to an API.
const socials = [
  ["Instagram", "https://instagram.com", "IG"],
  ["X", "https://x.com", "X"],
  ["LinkedIn", "https://linkedin.com", "in"]
];

export default function SiteFooter() {
  return (
    <footer className="relative mt-8 border-t border-line bg-panel">
      {/* Gradient hairline across the very top. */}
      <span className="pointer-events-none absolute inset-x-0 -top-px h-1 bg-gradient-to-r from-deep via-purple to-lilac" />

      <div className="mx-auto max-w-6xl px-5 py-14">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_2fr]">
          {/* Brand block + newsletter */}
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[linear-gradient(135deg,#3b0f8f,#6d28d9_60%,#a78bfa)] text-sm font-bold text-white shadow-glow">
                Q
              </span>
              <span className="text-lg font-semibold tracking-tight text-ink">
                Qren<span className="q-gradient-text">za</span>
              </span>
            </div>

            <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted">
              A phone-web loyalty desk for cafes, salons and restaurants. Scan once, and the shop remembers the guest.
            </p>

            <div className="mt-7 rounded-4xl border border-line bg-[linear-gradient(150deg,#ffffff,#f5f2ff)] p-5 shadow-soft">
              <Badge>Newsletter</Badge>
              <p className="mt-3 text-sm font-semibold text-ink">Shop-floor tactics, once a month.</p>
              <p className="mt-1 text-xs text-muted">Loyalty playbooks and product updates. No spam.</p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <input
                  type="email"
                  placeholder="you@shop.in"
                  aria-label="Email address"
                  className={`${inputClass} min-w-0 flex-1`}
                />
                <Button className="shrink-0">Subscribe</Button>
              </div>
            </div>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {columns.map((column) => (
              <div key={column.title}>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple">{column.title}</p>
                <ul className="mt-4 space-y-2.5 text-sm">
                  {column.links.map(([label, to]) => (
                    <li key={label}>
                      {to.startsWith("mailto:") ? (
                        <a className="inline-flex py-1 text-muted transition-colors hover:text-purple" href={to}>{label}</a>
                      ) : (
                        <Link className="inline-flex py-1 text-muted transition-colors hover:text-purple" to={to}>{label}</Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Social row */}
        <div className="mt-12 flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Follow</span>
          {socials.map(([label, href, glyph]) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noreferrer"
              aria-label={label}
              className="q-lift grid h-10 w-10 place-items-center rounded-2xl border border-line bg-raised text-xs font-semibold text-ink transition-colors hover:border-purple hover:text-purple"
            >
              {glyph}
            </a>
          ))}
          <a
            href="mailto:support@qrenza.in"
            aria-label="Email support"
            className="q-lift grid h-10 w-10 place-items-center rounded-2xl border border-line bg-raised text-ink transition-colors hover:border-purple hover:text-purple"
          >
            <Icon name="chat" className="h-4 w-4" />
          </a>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-line bg-raised/40">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>© {new Date().getFullYear()} Qrenza. All rights reserved.</span>
            <span className="hidden h-1 w-1 rounded-full bg-line sm:block" />
            <span>Made in India, for the shop floor.</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>Prices shown are inclusive of applicable tax.</span>
            <Link className="transition-colors hover:text-purple" to="/pricing">Pricing</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
