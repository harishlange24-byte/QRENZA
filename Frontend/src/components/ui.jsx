export function Card({ children, className = "" }) {
  return (
    <div className={`rounded-3xl border border-line bg-panel p-5 shadow-[0_1px_2px_rgba(16,16,24,0.04)] ${className}`}>
      {children}
    </div>
  );
}

export function Button({ children, variant = "primary", className = "", ...props }) {
  const styles = {
    primary: "bg-purple text-white shadow-[0_8px_20px_rgba(109,40,217,0.18)]",
    accent: "bg-lavender text-ink",
    ghost: "border border-line bg-raised text-ink"
  };
  return (
    <button
      className={`rounded-2xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50 ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Field({ label, error, children }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium tracking-wide text-purple">{label}</span>
      {children}
      {error ? <span className="text-xs text-purple">{error}</span> : null}
    </label>
  );
}

export const inputClass =
  "w-full rounded-2xl border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none placeholder:text-muted focus:border-purple";

export function Alert({ children }) {
  if (!children) return null;
  return <p className="rounded-2xl border border-line bg-raised px-3 py-2 text-sm text-ink">{children}</p>;
}

export function PageTitle({ title, subtitle }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
      {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
    </div>
  );
}

export function Empty({ title, text }) {
  return (
    <Card className="text-center">
      <p className="font-medium text-ink">{title}</p>
      <p className="mt-1 text-sm text-muted">{text}</p>
    </Card>
  );
}
