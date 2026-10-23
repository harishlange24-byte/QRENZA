import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { toast } from "react-toastify";
import { getDashboard } from "../../api/crm";
import { getErrorMessage } from "../../api/client";
import { Alert, Button, Card, Empty, PageTitle } from "../../components/ui";
import { useMerchantStore } from "../../context/MerchantStoreContext";

const tiles = [
  ["Stores & QR", "Print codes for tables and the counter", "/merchant/stores"],
  ["Menu", "Categories, prices, out of stock", "/merchant/menu"],
  ["Loyalty", "Stamp program and rewards", "/merchant/loyalty"],
  ["Queue", "Call, serve, skip", "/merchant/queue"],
  ["Orders", "Live table orders", "/merchant/orders"],
  ["Gift cards", "Events and streak offers", "/merchant/gift-cards"],
  ["Rewards", "Scratch prizes and redeem codes", "/merchant/rewards"],
  ["Feedback", "Private issues vs public reviews", "/merchant/feedback"],
  ["CRM", "Who visits, who went quiet", "/merchant/crm"],
  ["Analytics", "Visits and redemption", "/merchant/analytics"]
];

const BOXES = [
  ["stores", "stores"],
  ["menuItems", "menu items"],
  ["ordersToday", "orders today"],
  ["ordersTotal", "orders total"],
  ["customers", "customers"],
  ["newCustomers", "new today"],
  ["feedback", "reviews"],
  ["feedbackScore", "avg rating"],
  ["openIssues", "open issues"],
  ["queueWaiting", "in queue"],
  ["rewards", "rewards"],
  ["activeClaims", "unused rewards"],
  ["giftCards", "gift cards"],
  ["stamps", "stamps given"]
];

export default function DashboardPage() {
  const { stores, storeId } = useMerchantStore();
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState([]);
  const [error, setError] = useState("");

  const active = stores.find((s) => s.id === storeId);

  async function load() {
    if (!storeId) return;
    try {
      const { data } = await getDashboard(storeId);
      setSummary(data.data?.summary || null);
      setTrend(data.data?.trend || []);
    } catch (e) {
      setError(getErrorMessage(e));
      toast.error(getErrorMessage(e));
    }
  }

  useEffect(() => {
    load();
  }, [storeId]);

  if (!storeId) {
    return <Empty title="Pick a store" text="Select a store from the sidebar to see its numbers." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageTitle
          title={active ? active.name : "Merchant desk"}
          subtitle="One store at a time. Customer lists never mix between shops."
        />
        <Button variant="ghost" onClick={load}>Refresh</Button>
      </div>
      <Alert>{error}</Alert>

      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-purple">Revenue billed</p>
          <p className="text-3xl font-semibold text-ink">₹{Math.round(summary?.revenue || 0)}</p>
        </div>
        <p className="text-sm text-muted">
          across {summary?.ordersBilled || 0} order{summary?.ordersBilled === 1 ? "" : "s"}
        </p>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {BOXES.map(([key, label]) => (
          <Card key={key} className="text-center">
            <p className="text-2xl font-semibold text-ink">
              {key === "feedbackScore" ? (summary?.[key] ? Number(summary[key]).toFixed(1) : "—") : summary?.[key] ?? 0}
            </p>
            <p className="text-xs text-muted">{label}</p>
          </Card>
        ))}
      </div>

      <Card className="space-y-3">
        <p className="text-sm font-semibold text-ink">Last 7 days</p>
        {trend.length ? (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e7ef" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#6b7280" />
                <YAxis tick={{ fontSize: 11 }} stroke="#6b7280" allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="orders" name="Orders" fill="#c4b5fd" radius={[6, 6, 0, 0]} />
                <Line type="monotone" dataKey="visits" name="Scans" stroke="#7C3AED" strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-muted">No activity in the last week yet.</p>
        )}
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map(([label, text, to]) => (
          <Link key={to} to={to}>
            <Card className="h-full transition hover:border-purple">
              <p className="font-semibold text-ink">{label}</p>
              <p className="mt-1 text-xs text-muted">{text}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
