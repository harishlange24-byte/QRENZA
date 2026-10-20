import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAdminOverview } from "../../api/admin";
import { getErrorMessage } from "../../api/client";
import { Alert, Card, Empty, PageTitle } from "../../components/ui";

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

  const tiles = [
    ["Merchants", `${totals.activeMerchants ?? 0} of ${totals.totalMerchants ?? 0}`],
    ["Stores", `${totals.activeStores ?? 0} of ${totals.totalStores ?? 0}`],
    ["Customers", totals.totalUsers ?? 0],
    ["Staff", totals.totalStaff ?? 0],
    ["Loyalty cards", totals.totalCustomersWithCards ?? 0],
    ["New merchants (7d)", recent.newMerchants ?? 0],
    ["New payments (7d)", recent.newPayments ?? 0]
  ];

  return (
    <div className="space-y-4">
      <PageTitle title="Platform overview" subtitle="Everything happening across Qrenza right now." />
      <Alert>{error}</Alert>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map(([label, value]) => (
          <Card key={label}>
            <p className="text-xs uppercase tracking-wide text-purple">{label}</p>
            <p className="mt-1 text-2xl font-semibold text-ink">{value}</p>
          </Card>
        ))}
      </div>

      <Card>
        <p className="mb-3 text-sm font-semibold text-ink">Revenue</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-muted">Total collected</p>
            <p className="text-lg font-semibold text-ink">{money(revenue.totalCollected)}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Collected this month</p>
            <p className="text-lg font-semibold text-ink">{money(revenue.collectedThisMonth)}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Total refunded</p>
            <p className="text-lg font-semibold text-ink">{money(revenue.totalRefunded)}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Pending refund requests</p>
            <p className="text-lg font-semibold text-ink">{revenue.pendingRefundRequests ?? 0}</p>
          </div>
        </div>
      </Card>

      <Card>
        <p className="mb-3 text-sm font-semibold text-ink">Subscriptions</p>
        {subscriptions.length ? (
          <div className="divide-y divide-line">
            {subscriptions.map(([status, count]) => (
              <div key={status} className="flex items-center justify-between py-2 text-sm">
                <span className="text-muted">{status}</span>
                <span className="font-medium text-ink">{count}</span>
              </div>
            ))}
          </div>
        ) : (
          <Empty title="No subscriptions" text="No subscription records yet." />
        )}
      </Card>

      <Card>
        <p className="mb-3 text-sm font-semibold text-ink">Plans in use</p>
        {plans.length ? (
          <div className="divide-y divide-line">
            {plans.map((plan) => (
              <div key={plan.planCode} className="flex items-center justify-between py-2 text-sm">
                <span className="text-muted">{plan.planCode}</span>
                <span className="font-medium text-ink">{plan.count}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">No plans in use yet.</p>
        )}
      </Card>

      <Card>
        <p className="mb-3 text-sm font-semibold text-ink">Needs attention</p>
        <div className="divide-y divide-line">
          {[
            ["Trials ending soon", attention.trialsEndingSoon],
            ["Past due", attention.pastDue],
            ["Expired", attention.expired],
            ["Payment pending", attention.paymentPending],
            ["Pending plan changes", attention.pendingPlanChanges],
            ["Open issues", attention.openIssues]
          ].map(([label, count]) => (
            <div key={label} className="flex items-center justify-between py-2 text-sm">
              <span className="text-muted">{label}</span>
              <span className="font-medium text-ink">{count ?? 0}</span>
            </div>
          ))}
          <div className="flex items-center justify-between py-2 text-sm">
            <span className="text-muted">Pending refunds</span>
            <Link to="/admin/alerts" className="text-sm font-semibold text-purple">See alerts</Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
