import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import { Marquee, Reveal } from "../components/motion";
import { Alert, Button, Card, Field, PageTitle, SectionTitle, inputClass } from "../components/ui";
import { Icon } from "../components/icons";
import { getPlans, requestEnterpriseQuote, startTrial } from "../api/billing";
import { getErrorMessage } from "../api/client";

// Fallback order so the page still renders before the catalogue is seeded. The
// backend serves the real order in "featureOrder" and overrides this.
const FEATURE_ORDER = [
  "DIGITAL_STAMPS",
  "AI_MENU",
  "SCRATCH_CARDS",
  "QR_QUEUE",
  "FEEDBACK_INBOX",
  "CUSTOMER_CRM",
  "ANALYTICS",
  "UNLIMITED_QR_SCANS",
  "MULTI_BRANCH_QR",
  "GPS_BRANCH_DETECTION",
  "BRANCH_ANALYTICS",
  "WHATSAPP_CAMPAIGNS",
  "STAFF_ACCOUNTS",
  "PRIORITY_SUPPORT",
  "DEDICATED_ACCOUNT_MANAGER",
  "FREE_QR_STAND",
  "ENTERPRISE_CUSTOM"
];

const FAQ = [
  ["Is billing monthly or yearly?", "Qrenza is billed yearly in advance. The price you see is for one full year of that plan."],
  ["Do I need a card for the trial?", "No. The 3-day free trial starts without any payment details."],
  ["What happens when the trial ends?", "Your data stays. Paid features pause until you pick a plan, and you can upgrade at any time."],
  ["How many locations do I get?", "Basic supports 1 store, Growth up to 3, Pro up to 6 and Enterprise is unlimited by agreement."],
  ["Is tax included in the price?", "Yes. The amount shown is the amount you pay, with applicable tax already included."],
  ["Can I change plans later?", "Yes. You can request an upgrade from the dashboard and it applies after approval and payment."]
];

// Purely presentational trust rail for the hero band.
const RAIL = [
  "3-day free trial",
  "No card required",
  "Yearly billing, tax included",
  "Upgrade any time",
  "Multi-branch ready",
  "WhatsApp win-backs",
  "Priority support",
  "Unlimited QR scans"
];

export default function PricingPage() {
  const user = useSelector((s) => s.auth.user);
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [labels, setLabels] = useState({});
  const [order, setOrder] = useState(FEATURE_ORDER);
  const [billing, setBilling] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const [quote, setQuote] = useState({ businessName: "", contactPhone: "", expectedLocations: "", note: "" });

  const isMerchant = user?.role === "MERCHANT" || user?.role === "SUPER_ADMIN";

  useEffect(() => {
    getPlans()
      .then(({ data }) => {
        setPlans(data.plans || []);
        setLabels(data.featureLabels || {});
        setOrder(data.featureOrder?.length ? data.featureOrder : FEATURE_ORDER);
        setBilling(data.billing || null);
      })
      .catch((e) => setError(getErrorMessage(e)));
  }, []);

  async function startTrialFor(planCode) {
    if (!user) {
      navigate("/login", { state: { from: "/pricing" } });
      return;
    }
    setError("");
    setNotice("");
    setBusy(planCode);
    try {
      const { data } = await startTrial(planCode);
      setNotice(data.message);
      navigate("/merchant/billing");
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusy("");
    }
  }

  async function sendQuote(event) {
    event.preventDefault();
    if (!user) {
      navigate("/login", { state: { from: "/pricing" } });
      return;
    }
    setError("");
    setNotice("");
    setBusy("ENTERPRISE");
    try {
      const { data } = await requestEnterpriseQuote({
        businessInfo: { businessName: quote.businessName, contactPhone: quote.contactPhone },
        expectedLocations: quote.expectedLocations ? Number(quote.expectedLocations) : null,
        note: quote.note
      });
      setNotice(data.message);
      setQuote({ businessName: "", contactPhone: "", expectedLocations: "", note: "" });
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusy("");
    }
  }

  const rows = [
    { label: "Store locations", render: (plan) => (plan.unlimitedLocations ? "Unlimited" : String(plan.maximumLocations ?? "-")) },
    ...order.map((code) => ({ label: labels[code] || code, render: (plan) => (plan.features || []).includes(code) })),
    { label: "Support level", render: (plan) => plan.supportLevel }
  ];

  const policy = billing?.refundPolicy;

  return (
    <div className="min-h-screen overflow-x-hidden bg-paper">
      <SiteHeader />

      {/* -----------------------------------------------------------------
          Hero band. Gradient wash, aurora blobs, blueprint grid and a
          drifting orb, then the eyebrow, headline and plan intro.
          ----------------------------------------------------------------- */}
      <section className="relative isolate overflow-hidden px-5 pb-14 pt-12 md:pb-20 md:pt-16">
        <div className="pointer-events-none absolute inset-0 -z-30 bg-[radial-gradient(1100px_560px_at_12%_-10%,rgba(167,139,250,0.35),transparent_60%),radial-gradient(860px_480px_at_92%_6%,rgba(109,40,217,0.20),transparent_60%)]" />
        <div className="pointer-events-none absolute -left-24 top-2 -z-20 h-72 w-72 rounded-full bg-purple/25 blur-3xl q-drift" />
        <div className="pointer-events-none absolute -right-20 top-24 -z-20 h-80 w-80 rounded-full bg-lilac/25 blur-3xl q-drift" style={{ animationDelay: "-7s" }} />
        <div className="q-grid pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(70%_60%_at_40%_20%,#000,transparent)]" />

        <div className="relative mx-auto max-w-6xl">
          <p className="q-fade-up inline-flex items-center gap-2 rounded-full border border-line bg-panel/80 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-purple shadow-soft backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-purple q-pulse" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-purple" />
            </span>
            Yearly plans
          </p>

          <h1 className="q-fade-up q-delay-1 mt-5 max-w-2xl text-4xl font-semibold leading-[1.08] tracking-tight text-ink sm:text-5xl">
            Simple annual pricing, <span className="q-gradient-text">no surprises</span>
          </h1>

          <p className="q-fade-up q-delay-2 mt-5 max-w-2xl text-base leading-relaxed text-muted md:text-lg">
            Every plan is billed once a year in advance. Prices below already include applicable tax, so the amount you
            see is the amount you pay. All paid plans start with a {billing?.trialDays ?? 3}-day free trial and no card
            is required at trial signup.
          </p>

          <div className="q-fade-up q-delay-3 mt-8 flex flex-wrap gap-3">
            <a href="#plans"><Button size="lg">Compare plans</Button></a>
            <a href="#enterprise"><Button size="lg" variant="ghost">Talk to sales</Button></a>
          </div>

          {notice ? <div className="mt-6 max-w-2xl"><Alert>{notice}</Alert></div> : null}
          {error ? <div className="mt-4 max-w-2xl"><Alert>{error}</Alert></div> : null}
        </div>
      </section>

      {/* Trust rail */}
      <section className="border-y border-line bg-panel/60 py-5">
        <Marquee
          items={RAIL.map((text) => (
            <span key={text} className="flex items-center gap-3 whitespace-nowrap px-2 text-sm text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-purple/60" />
              {text}
            </span>
          ))}
        />
      </section>

      {/* Plan cards */}
      <section id="plans" className="scroll-mt-28 px-5 py-16">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <SectionTitle
              eyebrow="Pick a plan"
              title="One login, every counter tool switched on by plan"
              subtitle="Start on a free trial, keep whatever you seed, and move up when the shop grows."
            />
          </Reveal>

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {plans.map((plan, index) => {
              const highlight = plan.recommended;
              return (
                <Reveal key={plan.code} delay={index * 70}>
                  <Card
                    hover
                    halo={highlight}
                    className={`relative flex h-full flex-col ${
                      highlight
                        ? "border-transparent bg-panel shadow-lift ring-1 ring-purple/25"
                        : ""
                    }`}
                  >
                    {highlight ? (
                      <span className="absolute -top-3 left-5 inline-flex items-center rounded-full bg-[linear-gradient(135deg,#3b0f8f,#8b5cf6)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white shadow-glow">
                        Recommended
                      </span>
                    ) : null}

                    <p className="text-lg font-semibold text-ink">{plan.displayName}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted">{plan.description}</p>

                    <div className="mt-5">
                      {plan.isContactOnly ? (
                        <p className="text-3xl font-semibold tracking-tight text-ink">Custom</p>
                      ) : (
                        <div className="flex items-end gap-2">
                          <p className="text-3xl font-semibold tracking-tight text-ink">{plan.totals.displayPayable}</p>
                          <span className="pb-1 text-xs text-muted">/ year</span>
                        </div>
                      )}
                      {plan.offerActive && plan.totals.displayReference ? (
                        <p className="mt-1 text-xs text-muted">
                          <span className="line-through">{plan.totals.displayReference}</span> limited offer
                        </p>
                      ) : null}
                      {!plan.isContactOnly && billing?.pricesIncludeTax ? (
                        <p className="mt-1 text-xs text-muted">Includes {plan.totals.taxLabel} ({plan.totals.taxPercent}%)</p>
                      ) : null}
                    </div>

                    <p className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-ink">
                      <span className="grid h-6 w-6 place-items-center rounded-lg bg-lavender text-purple">
                        <Icon name="store" className="h-3.5 w-3.5" />
                      </span>
                      {plan.unlimitedLocations ? "Unlimited locations" : `${plan.maximumLocations} store location${plan.maximumLocations > 1 ? "s" : ""}`}
                    </p>

                    <ul className="mt-5 flex-1 space-y-2.5 text-sm text-muted">
                      {(plan.features || []).map((code) => (
                        <li key={code} className="flex items-start gap-2.5">
                          <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-lavender text-[9px] text-purple">✓</span>
                          <span>{labels[code] || code}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-6 space-y-2">
                      {plan.isContactOnly ? (
                        <a href="#enterprise" className="block">
                          <Button variant={highlight ? "primary" : "ghost"} className="w-full">Request a quote</Button>
                        </a>
                      ) : (
                        <Button
                          variant={highlight ? "primary" : "ghost"}
                          className="w-full"
                          disabled={busy === plan.code}
                          onClick={() => startTrialFor(plan.code)}
                        >
                          {busy === plan.code ? "Starting…" : "Start free trial"}
                        </Button>
                      )}
                      {isMerchant ? (
                        <Link to="/merchant/billing" className="block text-center text-xs text-purple">
                          Manage billing
                        </Link>
                      ) : null}
                    </div>
                  </Card>
                </Reveal>
              );
            })}

            {/* Skeletons while the catalogue loads. */}
            {!plans.length && !error
              ? Array.from({ length: 4 }, (_, i) => (
                  <Card key={`skeleton-${i}`} className="space-y-3">
                    <span className="q-shimmer block h-5 w-1/2 rounded-xl" />
                    <span className="q-shimmer block h-4 w-full rounded-xl" />
                    <span className="q-shimmer block h-9 w-2/3 rounded-xl" />
                    <span className="q-shimmer block h-4 w-full rounded-xl" />
                    <span className="q-shimmer block h-4 w-5/6 rounded-xl" />
                    <span className="q-shimmer block h-10 w-full rounded-2xl" />
                  </Card>
                ))
              : null}
          </div>
        </div>
      </section>

      {/* Comparison matrix */}
      <section className="px-5 pb-16">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <SectionTitle
              eyebrow="Feature matrix"
              title="Compare plans feature by feature"
              subtitle="Scroll the table sideways on a small screen to see every column."
            />
          </Reveal>

          <Reveal>
            <div className="overflow-x-auto rounded-4xl border border-line bg-panel shadow-soft">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line bg-raised/60 text-xs uppercase tracking-[0.14em] text-purple">
                    <th className="sticky left-0 z-10 bg-raised/80 p-4 backdrop-blur">Feature</th>
                    {plans.map((plan) => (
                      <th key={plan.code} className="p-4">{plan.displayName}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.label} className="border-b border-line last:border-0 transition-colors hover:bg-raised/50">
                      <td className="sticky left-0 z-10 bg-panel p-4 font-medium text-muted">{row.label}</td>
                      {plans.map((plan) => {
                        const value = row.render(plan);
                        return (
                          <td key={plan.code} className="p-4 text-ink">
                            {value === true ? (
                              <span className="inline-flex items-center gap-1.5 text-purple">
                                <span className="grid h-4 w-4 place-items-center rounded-full bg-lavender text-[9px]">✓</span>
                                Included
                              </span>
                            ) : value === false ? (
                              <span className="text-muted">—</span>
                            ) : (
                              value
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Refunds and cancellation */}
      <section className="px-5 pb-16">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <Card className="relative overflow-hidden">
              <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-deep via-purple to-lilac" />
              <PageTitle
                eyebrow="Billing"
                title="Refunds and cancellation"
                subtitle="The rules that apply to paid plans."
              />
              {policy ? (
                <ul className="grid gap-3 text-sm text-muted md:grid-cols-2">
                  <li className="flex gap-3 rounded-2xl bg-raised p-4">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-lavender text-[10px] text-purple">✓</span>
                    <span>First purchase: full refund can be requested within {policy.firstPurchaseWindowDays} days of the first paid payment.</span>
                  </li>
                  <li className="flex gap-3 rounded-2xl bg-raised p-4">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-lavender text-[10px] text-purple">✓</span>
                    <span>Renewal: full refund can be requested within {policy.renewalWindowDays} days of the renewal charge if the service was not used after renewal.</span>
                  </li>
                  <li className="flex gap-3 rounded-2xl bg-raised p-4">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-lavender text-[10px] text-purple">✓</span>
                    <span>Duplicate or failed charges are refunded in full.</span>
                  </li>
                  <li className="flex gap-3 rounded-2xl bg-raised p-4">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-lavender text-[10px] text-purple">✓</span>
                    <span>If the service cannot be provided as paid for, the unused portion is refunded.</span>
                  </li>
                  <li className="flex gap-3 rounded-2xl bg-raised p-4">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-lavender text-[10px] text-purple">✓</span>
                    <span>Outside these cases the current billing period is generally non-refundable.</span>
                  </li>
                  <li className="flex gap-3 rounded-2xl bg-raised p-4">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-lavender text-[10px] text-purple">✓</span>
                    <span>{policy.processingNote}</span>
                  </li>
                </ul>
              ) : null}
              <p className="mt-5 text-sm leading-relaxed text-muted">
                Cancelling stops the next renewal. Access continues until the end of the period you already paid for, and your
                stores, customers and earned rewards are never deleted.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link to={isMerchant ? "/merchant/billing" : "/login"}>
                  <Button variant="ghost">Manage or cancel a plan</Button>
                </Link>
                <a href={`mailto:${billing?.supportEmail || "support@qrenza.in"}`}>
                  <Button variant="ghost">Contact billing support</Button>
                </a>
              </div>
            </Card>
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-5 pb-16">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <SectionTitle
              eyebrow="FAQ"
              title="Pricing and billing questions"
              subtitle="Tap a question to open the answer."
            />
          </Reveal>

          <div className="grid gap-3 md:grid-cols-2">
            {FAQ.map(([question, answer], index) => (
              <Reveal key={question} delay={index * 50}>
                <Card>
                  <details className="group">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-ink">
                      {question}
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-lavender text-purple transition-transform duration-300 group-open:rotate-90">
                        <Icon name="chevron" className="h-4 w-4" />
                      </span>
                    </summary>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{answer}</p>
                  </details>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Enterprise quote */}
      <section id="enterprise" className="scroll-mt-28 px-5 pb-20">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <div className="relative overflow-hidden rounded-5xl bg-[linear-gradient(135deg,#1a0b3d_0%,#3b0f8f_45%,#6d28d9_100%)] px-6 py-12 sm:px-12">
              <div className="q-dots pointer-events-none absolute inset-0 opacity-25" />
              <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-lilac/30 blur-3xl q-float" />
              <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-glow/20 blur-3xl q-float-slow" />

              <div className="relative grid items-start gap-10 lg:grid-cols-2">
                <div>
                  <span className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
                    Enterprise
                  </span>
                  <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-white md:text-4xl">
                    Unlimited locations, custom commercial terms
                  </h2>
                  <p className="mt-4 max-w-md text-sm leading-relaxed text-white/75 md:text-base">
                    Tell us about the business and we will come back with a tailored quote, a dedicated account manager
                    and priority support across every branch.
                  </p>
                  <ul className="mt-6 space-y-3 text-sm text-white/80">
                    {["Unlimited store locations", "Dedicated account manager", "Priority support", "Custom invoicing and terms"].map((line) => (
                      <li key={line} className="flex items-center gap-3">
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/15 text-[10px] text-white">✓</span>
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-4xl border border-white/15 bg-white/95 p-6 shadow-lift backdrop-blur">
                  {notice ? <div className="mb-4"><Alert tone="success">{notice}</Alert></div> : null}
                  <form className="grid gap-4 sm:grid-cols-2" onSubmit={sendQuote}>
                    <Field label="Business name">
                      <input
                        className={inputClass}
                        placeholder="Business name"
                        value={quote.businessName}
                        onChange={(e) => setQuote({ ...quote, businessName: e.target.value })}
                      />
                    </Field>
                    <Field label="Contact phone">
                      <input
                        className={inputClass}
                        placeholder="Contact phone"
                        value={quote.contactPhone}
                        onChange={(e) => setQuote({ ...quote, contactPhone: e.target.value })}
                      />
                    </Field>
                    <Field label="Expected locations" hint="Rough is fine">
                      <input
                        className={inputClass}
                        placeholder="Expected number of locations"
                        value={quote.expectedLocations}
                        onChange={(e) => setQuote({ ...quote, expectedLocations: e.target.value })}
                      />
                    </Field>
                    <Field label="Note" hint="Optional">
                      <input
                        className={inputClass}
                        placeholder="Anything we should know"
                        value={quote.note}
                        onChange={(e) => setQuote({ ...quote, note: e.target.value })}
                      />
                    </Field>
                    <div className="sm:col-span-2">
                      <Button className="w-full" disabled={busy === "ENTERPRISE"}>
                        {busy === "ENTERPRISE" ? "Sending…" : user ? "Send request" : "Sign in to request a quote"}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
