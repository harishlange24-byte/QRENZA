import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAdminOverview } from "../../api/admin";
import { getErrorMessage } from "../../api/client";
import { Alert, Badge, Card, Empty, PageTitle, StatTile } from "../../components/ui";
import { Icon } from "../../components/icons";
import { CountUp, Reveal } from "../../components/motion";

const money = (paise) => (paise === null || paise === undefined ? "-" : `₹${(paise / 100).toLocaleString("en-IN")}`);

export default function AdminOverviewPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  async function load() {
    try {
      const { data: res } = await getAdminOverview();
      setData(res.data || null);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  useEffect(() => { load(); }, []);

  const totals = data?.totals || {};
  const revenue = data?.revenue || {};
  const attention = data?.attention || {};
  const recent = data?.recent || {};
  const subscriptions = Object.entries(data?.subscriptionsByStatus || {});
  const plans = data?.planDistribution || [];

  const subTotal = subscriptions.reduce((sum, [, count]) => sum + (count || 0), 0);
  const planMax = plans.reduce((max, plan) => Math.max(max, plan.count || 0), 0);

  const hero = [
    { label: "Merchants", value: totals.totalMerchants ?? 0, icon: "briefcase" },
    { label: "Stores", value: totals.totalStores ?? 0, icon: "store" },
    { label: "Customers", value: totals.totalUsers ?? 0, icon: "users" },
    { label: "Loyalty cards", value: totals.totalCustomersWithCards ?? 0, icon: "card" }
  ];

  const tiles = [
    { label: "Active merchants", value: `${totals.activeMerchants ?? 0} of ${totals.totalMerchants ?? 0}`, tone: "mint", icon: "briefcase" },
    { label: "Active stores", value: `${totals.activeStores ?? 0} of ${totals.totalStores ?? 0}`, tone: "purple", icon: "store" },
    { label: "Staff", value: totals.totalStaff ?? 0, tone: "ink", icon: "users" },
    { label: "New merchants (7d)", value: recent.newMerchants ?? 0, tone: "purple", icon: "spark" },
    { label: "New payments (7d)", value: recent.newPayments ?? 0, tone: "mint", icon: "cart" },
    { label: "Pending refunds", value: revenue.pendingRefundRequests ?? 0, tone: "amber", icon: "card" }
  ];

  const revenueRows = [
    ["Total collected", money(revenue.totalCollected)],
    ["Collected this month", money(revenue.collectedThisMonth)],
    ["Total refunded", money(revenue.totalRefunded)],
    ["Pending refund requests", revenue.pendingRefundRequests ?? 0]
  ];

  const attentionRows = [
    ["Trials ending soon", attention.trialsEndingSoon],
    ["Past due", attention.pastDue],
    ["Expired", attention.expired],
    ["Payment pending", attention.paymentPending],
    ["Pending plan changes", attention.pendingPlanChanges],
    ["Open issues", attention.openIssues]
  ];

  return (
    <div className="space-y-5">
      <PageTitle
        eyebrow="Super admin"
        title="Platform overview"
        subtitle="Everything happening across Qrenza right now."
      />
      <Alert>{error}</Alert>

      {/* Gradient hero: the four headline numbers, ticked up on first paint. */}
      <Reveal>
        <div className="relative overflow-hidden rounded-5xl bg-[linear-gradient(135deg,#1a0b3d_0%,#3b0f8f_45%,#6d28d9_100%)] px-6 py-8 shadow-lift sm:px-10 sm:py-10">
          <div className="q-grid pointer-events-none absolute inset-0 opacity-25" />
          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-lilac/30 blur-3xl q-float" />
          <div className="pointer-events-none absolute -bottom-24 -left-10 h-64 w-64 rounded-full bg-glow/20 blur-3xl q-float-slow" />

          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/80">
              <span className="h-2 w-2 animate-pulse rounded-full bg-mint" />
              Live platform
            </span>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              The whole platform, one glance
            </h2>
            <p className="mt-1.5 max-w-xl text-sm text-white/70">
              Merchants, stores and guests moving through Qrenza right now.
            </p>

            <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {hero.map((item) => (
                <div key={item.label} className="rounded-4xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">{item.label}</p>
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/15 text-white">
                      <Icon name={item.icon} className="h-4 w-4" />
                    </span>
                  </div>
                  <p className="mt-3 text-3xl font-semibold tracking-tight text-white">
                    <CountUp to={item.value} />
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Reveal>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((tile, index) => (
          <Reveal key={tile.label} delay={(index % 3) * 80} className="h-full">
            <StatTile
              label={tile.label}
              value={tile.value}
              tone={tile.tone}
              icon={<Icon name={tile.icon} className="h-4 w-4" />}
            />
          </Reveal>
        ))}
      </div>

      <Reveal delay={80}>
        <Card className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-ink">Revenue</p>
            <Badge tone="purple">Money in</Badge>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {revenueRows.map(([label, value]) => (
              <div key={label} className="rounded-3xl border border-line bg-raised/60 p-4">
                <p className="text-xs text-muted">{label}</p>
                <p className="mt-1 text-lg font-semibold text-ink">{value}</p>
              </div>
            ))}
          </div>
        </Card>
      </Reveal>

      <div className="grid gap-3 lg:grid-cols-2">
        <Reveal>
          <Card className="h-full space-y-4">
            <p className="text-sm font-semibold text-ink">Subscriptions</p>
            {subscriptions.length ? (
              <div className="space-y-3">
                {subscriptions.map(([status, count]) => {
                  const pct = subTotal ? Math.round(((count || 0) / subTotal) * 100) : 0;
                  return (
                    <div key={status}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="capitalize text-muted">{status}</span>
                        <span className="font-semibold text-ink">{count}</span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-raised">
                        <span
                          className="block h-full rounded-full bg-[linear-gradient(90deg,#6d28d9,#a78bfa)]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <Empty title="No subscriptions" text="No subscription records yet." />
            )}
          </Card>
        </Reveal>

        <Reveal delay={80}>
          <Card className="h-full space-y-4">
            <p className="text-sm font-semibold text-ink">Plans in use</p>
            {plans.length ? (
              <div className="space-y-3">
                {plans.map((plan) => {
                  const pct = planMax ? Math.round(((plan.count || 0) / planMax) * 100) : 0;
                  return (
                    <div key={plan.planCode}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted">{plan.planCode}</span>
                        <span className="font-semibold text-ink">{plan.count}</span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-raised">
                        <span
                          className="block h-full rounded-full bg-[linear-gradient(90deg,#0ea47a,#34d399)]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted">No plans in use yet.</p>
            )}
          </Card>
        </Reveal>
      </div>

      <Reveal>
        <Card className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-ink">Needs attention</p>
            <Link to="/admin/alerts" className="text-sm font-semibold text-purple hover:underline">
              See alerts
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {attentionRows.map(([label, count]) => (
              <div
                key={label}
                className="flex items-center justify-between rounded-2xl border border-line bg-raised/60 px-3.5 py-2.5 text-sm"
              >
                <span className="text-muted">{label}</span>
                <Badge tone={count ? "amber" : "neutral"}>{count ?? 0}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </Reveal>
    </div>
  );
}
