// The shared surface kit. Every screen builds from these, so a change here
// lands on the marketing site, the customer app and both dashboards at once.

export function Card({ children, className = "", hover = false, halo = false, as: Tag = "div", ...props }) {
  return (
    <Tag
      className={`rounded-4xl border border-line bg-panel p-5 shadow-soft ${
        halo ? "q-halo" : ""
      } ${hover ? "q-surface" : ""} ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function Button({ children, variant = "primary", size = "md", className = "", shine = true, ...props }) {
  const styles = {
    primary:
      "bg-[linear-gradient(135deg,#3b0f8f_0%,#6d28d9_55%,#8b5cf6_100%)] text-white shadow-glow hover:brightness-110",
    accent: "bg-lavender text-purple hover:bg-[#e4dcfd]",
    ghost: "border border-line bg-raised text-ink hover:border-lilac hover:bg-white",
    outline: "border border-line bg-transparent text-ink hover:border-purple hover:text-purple",
    danger: "bg-rose text-white hover:brightness-110",
    quiet: "text-muted hover:text-ink"
  };
  const sizes = {
    sm: "px-3 py-1.5 text-xs rounded-xl",
    md: "px-4 py-2.5 text-sm rounded-2xl",
    lg: "px-6 py-3 text-sm rounded-2xl"
  };
  const filled = variant !== "ghost" && variant !== "outline" && variant !== "quiet";

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 font-semibold transition-all duration-300 disabled:pointer-events-none disabled:opacity-50 ${
        sizes[size] || sizes.md
      } ${styles[variant] || styles.primary} ${filled && shine ? "q-shine" : ""} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Field({ label, hint, error, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-purple">{label}</span>
        {hint ? <span className="text-[11px] text-muted">{hint}</span> : null}
      </span>
      {children}
      {error ? <span className="block text-xs font-medium text-rose">{error}</span> : null}
    </label>
  );
}

export const inputClass =
  "w-full rounded-2xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink shadow-[inset_0_1px_2px_rgba(16,16,24,0.03)] outline-none transition-all duration-200 placeholder:text-muted hover:border-lilac focus:border-purple focus:ring-4 focus:ring-purple/10";

export function Alert({ children, tone = "info" }) {
  if (!children) return null;

  const tones = {
    info: "border-line bg-raised text-ink",
    success: "border-mint/30 bg-mint/10 text-mint",
    warn: "border-amber/30 bg-amber/10 text-amber",
    error: "border-rose/30 bg-rose/10 text-rose"
  };

  return (
    <p className={`rounded-2xl border px-4 py-3 text-sm ${tones[tone] || tones.info}`} role="status">
      {children}
    </p>
  );
}

export function PageTitle({ eyebrow, title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow ? (
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-purple">{eyebrow}</p>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1.5 max-w-2xl text-sm text-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function SectionTitle({ eyebrow, title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow ? (
          <p className="mb-2 inline-flex rounded-full border border-line bg-panel px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-purple">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">{title}</h2>
        {subtitle ? <p className="mt-2 max-w-2xl text-sm text-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Badge({ children, tone = "purple", className = "" }) {
  const tones = {
    purple: "bg-lavender text-purple",
    neutral: "bg-raised text-muted",
    ink: "bg-ink text-white",
    mint: "bg-mint/12 text-mint",
    amber: "bg-amber/12 text-amber",
    rose: "bg-rose/12 text-rose",
    outline: "border border-line text-muted"
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
        tones[tone] || tones.purple
      } ${className}`}
    >
      {children}
    </span>
  );
}

export function StatTile({ label, value, hint, tone = "purple", icon }) {
  const bars = {
    purple: "from-purple to-lilac",
    mint: "from-mint to-emerald-300",
    amber: "from-amber to-amber-300",
    rose: "from-rose to-rose-300",
    ink: "from-ink to-ink-soft"
  };
  return (
    <Card hover className="relative overflow-hidden">
      <span className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${bars[tone] || bars.purple}`} />
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{label}</p>
        {icon ? <span className="grid h-8 w-8 place-items-center rounded-xl bg-raised text-purple">{icon}</span> : null}
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-ink">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </Card>
  );
}

export function Skeleton({ className = "h-4 w-full" }) {
  return <span className={`q-shimmer block rounded-xl ${className}`} />;
}

export function Empty({ title, text, action }) {
  return (
    <Card className="flex flex-col items-center py-10 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-lavender text-xl text-purple">✦</span>
      <p className="mt-4 font-semibold text-ink">{title}</p>
      {text ? <p className="mt-1 max-w-sm text-sm text-muted">{text}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </Card>
  );
}
