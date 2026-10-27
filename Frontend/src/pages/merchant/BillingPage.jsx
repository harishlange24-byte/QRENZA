import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  getPlans,
  getMySubscription,
  getSubscriptionHistory,
  startTrial,
  createCheckout,
  verifyCheckout,
  cancelSubscription,
  resumeSubscription,
  requestPlanChange,
  requestEnterpriseQuote,
  requestRefund
} from "../../api/billing";
import { getErrorMessage } from "../../api/client";
import { Alert, Badge, Button, Card, Field, inputClass, PageTitle } from "../../components/ui";
import { Icon } from "../../components/icons";
import { Reveal } from "../../components/motion";

const money = (paise) => (paise === null || paise === undefined ? "-" : `₹${(paise / 100).toLocaleString("en-IN")}`);

const STATUS_LABEL = {
  NONE: "No plan",
  TRIALING: "Free trial",
  ACTIVE: "Active",
  PAYMENT_PENDING: "Payment pending",
  PAST_DUE: "Payment due",
  CANCELLED: "Cancels at period end",
  EXPIRED: "Expired",
  SUSPENDED: "Suspended"
};

function loadRazorpay() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function BillingPage() {
  const navigate = useNavigate();
  const user = useSelector((s) => s.auth.user);
  const isMerchant = user?.role === "MERCHANT";

  const [access, setAccess] = useState(null);
  const [billing, setBilling] = useState(null);
  const [plans, setPlans] = useState([]);
  const [labels, setLabels] = useState({});
  const [history, setHistory] = useState({ subscriptions: [], payments: [] });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [refund, setRefund] = useState({ paymentId: "", reason: "" });
  const [quote, setQuote] = useState({ expectedLocations: "", note: "" });

  async function load() {
    try {
      const [{ data: sub }, { data: plansData }, { data: hist }] = await Promise.all([
        getMySubscription(),
        getPlans(),
        getSubscriptionHistory()
      ]);
      setAccess(sub.access || null);
      setBilling(sub.billing || null);
      setPlans(plansData.plans || []);
      setLabels(plansData.featureLabels || {});
      setHistory({ subscriptions: hist.subscriptions || [], payments: hist.payments || [] });
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  useEffect(() => { load(); }, []);

  async function pay(planCode) {
    if (!isMerchant) return setError("Only the account owner can manage billing.");
    setError(""); setNotice(""); setBusy(planCode);
    try {
      const { data } = await createCheckout(planCode);
      const ready = await loadRazorpay();
      if (!ready) throw new Error("Unable to load the payment window");
      const checkout = new window.Razorpay({
        key: data.keyId,
        amount: data.order.amount,
        currency: data.order.currency,
        name: "Qrenza",
        description: `${data.plan.displayName} · yearly`,
        order_id: data.order.id,
        theme: { color: "#7c3aed" },
        handler: async (response) => {
          try {
            const { data: verified } = await verifyCheckout({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature
            });
            setNotice(verified.message);
            await load();
          } catch (e) {
            setError(getErrorMessage(e));
          }
        }
      });
      checkout.on("payment.failed", (response) => setError(response?.error?.description || "Payment failed"));
      checkout.open();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusy("");
    }
  }

  async function trial(planCode) {
    setError(""); setNotice(""); setBusy(planCode);
    try {
      const { data } = await startTrial(planCode);
      setNotice(data.message);
      await load();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusy("");
    }
  }

  async function changePlan(planCode) {
    setError(""); setNotice(""); setBusy(planCode);
    try {
      const { data } = await requestPlanChange(planCode);
      setNotice(data.message);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusy("");
    }
  }

  async function cancel() {
    setError(""); setNotice(""); setBusy("cancel");
    try {
      const { data } = await cancelSubscription(cancelReason);
      setNotice(data.message);
      setCancelReason("");
      await load();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusy("");
    }
  }

  async function resume() {
    setError(""); setNotice(""); setBusy("resume");
    try {
      const { data } = await resumeSubscription();
      setNotice(data.message);
      await load();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusy("");
    }
  }

  async function sendRefund(event) {
    event.preventDefault();
    setError(""); setNotice(""); setBusy("refund");
    try {
      const { data } = await requestRefund(refund);
      setNotice(data.message);
      setRefund({ paymentId: "", reason: "" });
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusy("");
    }
  }

  async function sendQuote(event) {
    event.preventDefault();
    setError(""); setNotice(""); setBusy("quote");
    try {
      const { data } = await requestEnterpriseQuote({
        expectedLocations: quote.expectedLocations ? Number(quote.expectedLocations) : null,
        note: quote.note
      });
      setNotice(data.message);
      setQuote({ expectedLocations: "", note: "" });
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusy("");
    }
  }

  const status = access?.status || "NONE";
  const usable = Boolean(access?.isUsable);
  const usage = access?.locationUsage;

  return (
    <div className="space-y-6">
      <Reveal>
        <PageTitle
          eyebrow="Account"
          title="Billing & plans"
          subtitle="Your plan, trial, payments, refunds and cancellation."
        />
      </Reveal>

      <Alert tone="error">{error}</Alert>
      <Alert tone="success">{notice}</Alert>

      <Reveal>
        <Card halo className="overflow-hidden p-0">
          <div className="relative overflow-hidden bg-[linear-gradient(135deg,#2e0b72_0%,#6d28d9_55%,#8b5cf6_100%)] px-5 py-6 text-white sm:px-7">
            <div className="q-dots pointer-events-none absolute inset-0 opacity-20" />
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/15 blur-3xl q-float" />

            <div className="relative flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/70">Current plan</p>
                <p className="mt-1 text-2xl font-semibold sm:text-3xl">
                  {access?.plan?.displayName || "No plan selected"}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  usable ? "bg-white text-purple" : "bg-white/15 text-white/90 ring-1 ring-inset ring-white/30"
                }`}
              >
                {STATUS_LABEL[status] || status}
              </span>
            </div>

            <div className="relative mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-white/10 p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-white/60">Access until</p>
                <p className="mt-1 text-sm font-medium">
                  {access?.accessUntil ? new Date(access.accessUntil).toDateString() : "-"}
                </p>
              </div>
              <div className="rounded-2xl bg-white/10 p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-white/60">Renewal</p>
                <p className="mt-1 text-sm font-medium">
                  {access?.trialLabel ? `Trial: ${access.trialLabel}` : access?.autoRenew ? "Renews yearly" : "Renewal off"}
                </p>
              </div>
              <div className="rounded-2xl bg-white/10 p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-white/60">Locations</p>
                <p className="mt-1 text-sm font-medium">
                  {usage ? `${usage.used}${usage.unlimited ? "" : ` / ${usage.limit}`}${usage.unlimited ? " (unlimited)" : ""}` : "-"}
                </p>
              </div>
            </div>

            {access?.messages?.length ? (
              <ul className="relative mt-4 space-y-1 text-sm text-white/80">
                {access.messages.map((msg) => <li key={msg}>• {msg}</li>)}
              </ul>
            ) : null}
          </div>
        </Card>
      </Reveal>

      <div>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-purple">Available plans</p>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => {
            const isCurrent = access?.hasPlan && plan.code === access.planCode;
            return (
              <Card key={plan.code} hover className={plan.recommended ? "border-purple shadow-glow" : ""}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-base font-semibold text-ink">{plan.displayName}</p>
                  {plan.recommended ? <Badge tone="purple">Recommended</Badge> : null}
                </div>
                <p className="mt-1 text-xs text-muted">{plan.description}</p>
                <p className="mt-3 text-2xl font-semibold text-ink">
                  {plan.isContactOnly ? "Custom" : plan.totals.displayPayable}
                  {!plan.isContactOnly ? <span className="text-xs font-medium text-muted"> / year</span> : null}
                </p>
                {!plan.isContactOnly && billing?.pricesIncludeTax ? (
                  <p className="mt-1 text-xs text-muted">Includes {plan.totals.taxLabel} ({plan.totals.taxPercent}%)</p>
                ) : null}

                <ul className="mt-4 space-y-2 text-xs text-muted">
                  {(plan.features || []).map((code) => (
                    <li key={code} className="flex gap-2">
                      <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-lavender text-[9px] text-purple">✓</span>
                      <span>{labels[code] || code}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-5 space-y-2">
                  {plan.isContactOnly ? (
                    <Button variant="ghost" className="w-full" onClick={() => navigate("/pricing#enterprise")}>
                      Request a quote
                    </Button>
                  ) : isCurrent ? (
                    <Button variant="ghost" className="w-full" disabled>Current plan</Button>
                  ) : (
                    <>
                      {!access?.hasPlan ? (
                        <Button
                          className="w-full"
                          disabled={busy === plan.code}
                          onClick={() => trial(plan.code)}
                        >
                          {busy === plan.code ? "Starting…" : "Start free trial"}
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          className="w-full"
                          disabled={busy === plan.code}
                          onClick={() => changePlan(plan.code)}
                        >
                          Request change
                        </Button>
                      )}
                      <Button
                        variant={access?.hasPlan ? "primary" : "ghost"}
                        className="w-full"
                        disabled={busy === plan.code}
                        onClick={() => pay(plan.code)}
                      >
                        {busy === plan.code ? "Please wait…" : "Pay & activate"}
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {access?.hasPlan && !access?.cancelAtPeriodEnd ? (
        <Reveal>
          <Card className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-lavender text-purple">
                <Icon name="bell" className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">Cancel renewal</p>
                <p className="text-xs text-muted">Access continues until the end of the period you already paid for.</p>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <input
                className={inputClass}
                placeholder="Reason (optional)"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
              <Button variant="ghost" disabled={busy === "cancel"} onClick={cancel}>
                {busy === "cancel" ? "Cancelling…" : "Cancel renewal"}
              </Button>
            </div>
          </Card>
        </Reveal>
      ) : null}

      {access?.hasPlan && access?.cancelAtPeriodEnd ? (
        <Reveal>
          <Card className="space-y-4 border-purple">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-lavender text-purple">
                <Icon name="stamp" className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">Renewal cancelled</p>
                <p className="text-xs text-muted">You can turn automatic renewal back on until the paid period ends.</p>
              </div>
            </div>
            <div className="flex items-end">
              <Button disabled={busy === "resume"} onClick={resume}>
                {busy === "resume" ? "Resuming…" : "Resume renewal"}
              </Button>
            </div>
          </Card>
        </Reveal>
      ) : null}

      <Reveal>
        <Card>
          <div className="mb-4 flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-lavender text-purple">
              <Icon name="card" className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">Request a refund</p>
              <p className="text-xs text-muted">A request is reviewed by an admin before any money is returned.</p>
            </div>
          </div>

          <form className="grid gap-3 md:grid-cols-3" onSubmit={sendRefund}>
            <Field label="Paid payment">
              <select className={inputClass} value={refund.paymentId} onChange={(e) => setRefund({ ...refund, paymentId: e.target.value })}>
                <option value="">Select a payment</option>
                {history.payments.filter((p) => p.status === "PAID").map((p) => (
                  <option key={p.id} value={p.id}>{money(p.amount)} · {p.planCode} · {new Date(p.createdAt).toDateString()}</option>
                ))}
              </select>
            </Field>
            <Field label="Reason">
              <input
                className={inputClass}
                placeholder="Why are you requesting a refund?"
                value={refund.reason}
                onChange={(e) => setRefund({ ...refund, reason: e.target.value })}
              />
            </Field>
            <div className="flex items-end">
              <Button className="w-full" disabled={busy === "refund"}>Submit request</Button>
            </div>
          </form>

          {billing?.refundPolicy ? (
            <p className="mt-3 text-xs text-muted">
              Eligible within {billing.refundPolicy.firstPurchaseWindowDays} days of the first purchase, or{" "}
              {billing.refundPolicy.renewalWindowDays} days of a renewal if unused. Contact {billing.supportEmail}.
            </p>
          ) : null}
        </Card>
      </Reveal>

      <Reveal>
        <Card className="relative overflow-hidden">
          <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-lavender/70 blur-3xl" />
          <div className="relative mb-4 flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-lavender text-purple">
              <Icon name="briefcase" className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">Enterprise</p>
              <p className="text-xs text-muted">Unlimited locations and custom terms.</p>
            </div>
          </div>

          <form className="relative grid gap-3 md:grid-cols-3" onSubmit={sendQuote}>
            <Field label="Expected locations">
              <input
                className={inputClass}
                placeholder="e.g. 25"
                value={quote.expectedLocations}
                onChange={(e) => setQuote({ ...quote, expectedLocations: e.target.value })}
              />
            </Field>
            <Field label="Note">
              <input
                className={inputClass}
                placeholder="Anything we should know"
                value={quote.note}
                onChange={(e) => setQuote({ ...quote, note: e.target.value })}
              />
            </Field>
            <div className="flex items-end">
              <Button variant="ghost" className="w-full" disabled={busy === "quote"}>Send request</Button>
            </div>
          </form>
        </Card>
      </Reveal>

      <Reveal>
        <Card>
          <div className="mb-4 flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-lavender text-purple">
              <Icon name="file" className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">Subscription history</p>
              <p className="text-xs text-muted">Every subscription on this account.</p>
            </div>
          </div>

          {history.subscriptions.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-wide text-purple">
                    <th className="py-2.5 pr-4 font-semibold">Plan</th>
                    <th className="py-2.5 pr-4 font-semibold">Status</th>
                    <th className="py-2.5 pr-4 font-semibold">Period</th>
                    <th className="py-2.5 font-semibold">Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {history.subscriptions.map((s) => (
                    <tr key={s.id} className="border-b border-line last:border-0">
                      <td className="py-2.5 pr-4 text-ink">{s.planName}{s.isTrial ? " (trial)" : ""}</td>
                      <td className="py-2.5 pr-4 text-muted">{STATUS_LABEL[s.status] || s.status}</td>
                      <td className="py-2.5 pr-4 text-muted">
                        {new Date(s.trialStart || s.currentPeriodStart || s.createdAt).toDateString()}
                        {" → "}
                        {s.trialEnd || s.currentPeriodEnd ? new Date(s.trialEnd || s.currentPeriodEnd).toDateString() : "-"}
                      </td>
                      <td className="py-2.5 text-ink">{money(s.totalPaidAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="rounded-2xl bg-raised px-4 py-6 text-center text-sm text-muted">No subscriptions yet.</p>
          )}
        </Card>
      </Reveal>

      <Reveal>
        <Card>
          <div className="mb-4 flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-lavender text-purple">
              <Icon name="card" className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">Payment history</p>
              <p className="text-xs text-muted">Verified payments and their refunds.</p>
            </div>
          </div>

          {history.payments.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-wide text-purple">
                    <th className="py-2.5 pr-4 font-semibold">Date</th>
                    <th className="py-2.5 pr-4 font-semibold">Plan</th>
                    <th className="py-2.5 pr-4 font-semibold">Amount</th>
                    <th className="py-2.5 pr-4 font-semibold">Status</th>
                    <th className="py-2.5 font-semibold">Refunded</th>
                  </tr>
                </thead>
                <tbody>
                  {history.payments.map((p) => (
                    <tr key={p.id} className="border-b border-line last:border-0">
                      <td className="py-2.5 pr-4 text-muted">{new Date(p.createdAt).toDateString()}</td>
                      <td className="py-2.5 pr-4 text-ink">{p.planCode}</td>
                      <td className="py-2.5 pr-4 text-ink">{money(p.amount)}</td>
                      <td className="py-2.5 pr-4">
                        <Badge tone={p.status === "PAID" ? "mint" : p.status === "REFUNDED" ? "amber" : "neutral"}>
                          {p.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 text-muted">{p.refundAmount ? money(p.refundAmount) : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="rounded-2xl bg-raised px-4 py-6 text-center text-sm text-muted">No payments yet.</p>
          )}
        </Card>
      </Reveal>

      <p className="text-xs text-muted">
        Need to compare plans? See the <Link to="/pricing" className="font-medium text-purple">pricing page</Link>.
      </p>
    </div>
  );
}
