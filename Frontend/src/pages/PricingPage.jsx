import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import SiteHeader from "../components/SiteHeader";
import { Alert, Button, Card, PageTitle, inputClass } from "../components/ui";
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
    <div className="min-h-screen bg-paper">
      <SiteHeader />

      <section className="relative overflow-hidden px-5 pb-12 pt-6">
        <div className="pointer-events-none absolute -left-20 top-0 h-64 w-64 rounded-full bg-purple/25 blur-3xl" />
        <div className="relative mx-auto max-w-6xl">
          <p className="mb-4 inline-flex rounded-full border border-line bg-panel px-3 py-1 text-xs uppercase tracking-widest text-purple">
            Yearly plans
          </p>
          <h1 className="text-4xl font-semibold leading-tight text-ink md:text-5xl">Simple annual pricing</h1>
          <p className="mt-4 max-w-2xl text-base text-muted">
            Every plan is billed once a year in advance. Prices below already include applicable tax, so the amount you
            see is the amount you pay. All paid plans start with a {billing?.trialDays ?? 3}-day free trial and no card
            is required at trial signup.
          </p>
          {notice ? <div className="mt-4 max-w-2xl"><Alert>{notice}</Alert></div> : null}
          {error ? <div className="mt-4 max-w-2xl"><Alert>{error}</Alert></div> : null}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-12">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => {
            const highlight = plan.recommended;
            const muted = highlight ? "text-ink/70" : "text-muted";
            const strong = "text-ink";
            return (
              <div
                key={plan.code}
                className={`flex flex-col rounded-3xl border p-5 ${
                  highlight
                    ? "border-purple bg-white shadow-[0_8px_20px_rgba(109,40,217,0.18)]"
                    : "border-line bg-panel"
                }`}
              >
                {highlight ? (
                  <span className="mb-2 w-fit rounded-full bg-purple px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
                    Recommended
                  </span>
                ) : null}
                <p className={`text-lg font-semibold ${strong}`}>{plan.displayName}</p>
                <p className={`mt-1 text-xs ${muted}`}>{plan.description}</p>

                <div className="mt-4">
                  {plan.isContactOnly ? (
                    <p className={`text-3xl font-semibold ${strong}`}>Custom</p>
                  ) : (
                    <div className="flex items-end gap-2">
                      <p className={`text-3xl font-semibold ${strong}`}>{plan.totals.displayPayable}</p>
                      <span className={`pb-1 text-xs ${muted}`}>/ year</span>
                    </div>
                  )}
                  {plan.offerActive && plan.totals.displayReference ? (
                    <p className={`mt-1 text-xs ${muted}`}>
                      <span className="line-through">{plan.totals.displayReference}</span> limited offer
                    </p>
                  ) : null}
                  {!plan.isContactOnly && billing?.pricesIncludeTax ? (
                    <p className={`mt-1 text-xs ${muted}`}>Includes {plan.totals.taxLabel} ({plan.totals.taxPercent}%)</p>
                  ) : null}
                </div>

                <p className={`mt-3 text-sm font-medium ${strong}`}>
                  {plan.unlimitedLocations ? "Unlimited locations" : `${plan.maximumLocations} store location${plan.maximumLocations > 1 ? "s" : ""}`}
                </p>

                <ul className={`mt-4 flex-1 space-y-2 text-sm ${muted}`}>
                  {(plan.features || []).map((code) => (
                    <li key={code} className="flex gap-2">
                      <span className="text-purple">•</span>
                      <span>{labels[code] || code}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-5 space-y-2">
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
              </div>
            );
          })}
        </div>
        {!plans.length && !error ? <p className="mt-6 text-sm text-muted">Loading plans…</p> : null}
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-14">
        <h2 className="mb-4 text-2xl font-semibold text-ink">Compare plans</h2>
        <div className="overflow-x-auto rounded-3xl border border-line bg-panel">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-purple">
                <th className="p-4">Feature</th>
                {plans.map((plan) => (
                  <th key={plan.code} className="p-4">{plan.displayName}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-b border-line last:border-0">
                  <td className="p-4 text-muted">{row.label}</td>
                  {plans.map((plan) => {
                    const value = row.render(plan);
                    return (
                      <td key={plan.code} className="p-4 text-ink">
                        {value === true ? <span className="text-purple">Included</span> : value === false ? <span className="text-muted">-</span> : value}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted">Scroll the table sideways on a small screen.</p>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-14">
        <h2 className="mb-4 text-2xl font-semibold text-ink">Pricing and billing questions</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {FAQ.map(([question, answer]) => (
            <details key={question} className="rounded-2xl border border-line bg-panel p-4">
              <summary className="cursor-pointer text-sm font-semibold text-ink">{question}</summary>
              <p className="mt-2 text-sm text-muted">{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-14">
        <Card>
          <PageTitle title="Refunds and cancellation" subtitle="The rules that apply to paid plans." />
          {policy ? (
            <ul className="space-y-2 text-sm text-muted">
              <li>• First purchase: full refund can be requested within {policy.firstPurchaseWindowDays} days of the first paid payment.</li>
              <li>• Renewal: full refund can be requested within {policy.renewalWindowDays} days of the renewal charge if the service was not used after renewal.</li>
              <li>• Duplicate or failed charges are refunded in full.</li>
              <li>• If the service cannot be provided as paid for, the unused portion is refunded.</li>
              <li>• Outside these cases the current billing period is generally non-refundable.</li>
              <li>• {policy.processingNote}</li>
            </ul>
          ) : null}
          <p className="mt-4 text-sm text-muted">
            Cancelling stops the next renewal. Access continues until the end of the period you already paid for, and your
            stores, customers and earned rewards are never deleted.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link to={isMerchant ? "/merchant/billing" : "/login"}>
              <Button variant="ghost">Manage or cancel a plan</Button>
            </Link>
            <a href={`mailto:${billing?.supportEmail || "support@qrenza.in"}`}>
              <Button variant="ghost">Contact billing support</Button>
            </a>
          </div>
        </Card>
      </section>

      <section id="enterprise" className="mx-auto max-w-6xl px-5 pb-20">
        <Card>
          <PageTitle title="Enterprise" subtitle="Unlimited locations, custom commercial terms, dedicated support." />
          {notice ? <Alert>{notice}</Alert> : null}
          <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={sendQuote}>
            <input
              className={inputClass}
              placeholder="Business name"
              value={quote.businessName}
              onChange={(e) => setQuote({ ...quote, businessName: e.target.value })}
            />
            <input
              className={inputClass}
              placeholder="Contact phone"
              value={quote.contactPhone}
              onChange={(e) => setQuote({ ...quote, contactPhone: e.target.value })}
            />
            <input
              className={inputClass}
              placeholder="Expected number of locations"
              value={quote.expectedLocations}
              onChange={(e) => setQuote({ ...quote, expectedLocations: e.target.value })}
            />
            <input
              className={inputClass}
              placeholder="Anything we should know"
              value={quote.note}
              onChange={(e) => setQuote({ ...quote, note: e.target.value })}
            />
            <div className="md:col-span-2">
              <Button className="w-full md:w-auto" disabled={busy === "ENTERPRISE"}>
                {busy === "ENTERPRISE" ? "Sending…" : user ? "Send request" : "Sign in to request a quote"}
              </Button>
            </div>
          </form>
        </Card>
      </section>
    </div>
  );
}
