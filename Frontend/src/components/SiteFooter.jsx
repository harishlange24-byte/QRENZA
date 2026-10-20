import { Link } from "react-router-dom";

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

export default function SiteFooter() {
  return (
    <footer className="border-t border-line bg-panel">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-2xl bg-purple text-sm font-bold text-white">Q</span>
            <span className="text-lg font-semibold text-ink">Qrenza</span>
          </div>
          <p className="mt-4 max-w-xs text-sm text-muted">
            A phone-web loyalty desk for cafes, salons and restaurants. Scan once, and the shop remembers the guest.
          </p>
          <p className="mt-4 text-xs text-muted">Made in India, for the shop floor.</p>
        </div>

        {columns.map((column) => (
          <div key={column.title}>
            <p className="text-xs font-semibold uppercase tracking-widest text-purple">{column.title}</p>
            <ul className="mt-4 space-y-2 text-sm">
              {column.links.map(([label, to]) => (
                <li key={label}>
                  {to.startsWith("mailto:") ? (
                    <a className="text-muted hover:text-ink" href={to}>{label}</a>
                  ) : (
                    <Link className="text-muted hover:text-ink" to={to}>{label}</Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Qrenza. All rights reserved.</p>
          <p>Prices shown are inclusive of applicable tax.</p>
        </div>
      </div>
    </footer>
  );
}
