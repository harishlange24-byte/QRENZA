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
import { Alert, Badge, Button, Card, Empty, PageTitle, StatTile } from "../../components/ui";
import { Icon } from "../../components/icons";
import { CountUp, Reveal } from "../../components/motion";
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

const TILE_ICONS = {
  "/merchant/stores": "store",
  "/merchant/menu": "list",
  "/merchant/loyalty": "stamp",
  "/merchant/queue": "queue",
  "/merchant/orders": "bag",
  "/merchant/gift-cards": "gift",
  "/merchant/rewards": "reward",
  "/merchant/feedback": "chat",
  "/merchant/crm": "users",
  "/merchant/analytics": "chart"
};

const BOX_META = {
  stores: { tone: "purple", icon: "store" },
  menuItems: { tone: "purple", icon: "list" },
  ordersToday: { tone: "mint", icon: "bag" },
  ordersTotal: { tone: "ink", icon: "cart" },
  customers: { tone: "purple", icon: "users" },
  newCustomers: { tone: "mint", icon: "users" },
  feedback: { tone: "amber", icon: "chat" },
  feedbackScore: { tone: "amber", icon: "stamp" },
  openIssues: { tone: "rose", icon: "bell" },
  queueWaiting: { tone: "amber", icon: "queue" },
  rewards: { tone: "purple", icon: "reward" },
  activeClaims: { tone: "mint", icon: "gift" },
  giftCards: { tone: "purple", icon: "card" },
  stamps: { tone: "purple", icon: "stamp" }
};

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

  const heroMetrics = [
    ["orders today", summary?.ordersToday ?? 0],
    ["customers", summary?.customers ?? 0],
    ["new today", summary?.newCustomers ?? 0],
    ["in queue", summary?.queueWaiting ?? 0]
  ];

  return (
    <div className="space-y-6">
      <Reveal>
        <PageTitle
          eyebrow="Overview"
          title={active ? active.name : "Merchant desk"}
          subtitle="One store at a time. Customer lists never mix between shops."
          actions={
            <Button variant="ghost" onClick={load}>
              <Icon name="spark" className="h-4 w-4 text-purple" />
              Refresh
            </Button>
          }
        />
      </Reveal>

      <Alert>{error}</Alert>

      <Reveal delay={60}>
        <div className="relative isolate overflow-hidden rounded-5xl bg-[linear-gradient(135deg,#1a0b3d_0%,#3b0f8f_45%,#6d28d9_100%)] px-5 py-8 shadow-lift sm:px-10 sm:py-10">
          <div className="q-dots pointer-events-none absolute inset-0 opacity-25" />
          <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-lilac/30 blur-3xl q-float" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-glow/20 blur-3xl q-float-slow" />

          <div className="relative">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/70">Revenue billed</p>
            <div className="mt-2 flex flex-wrap items-end gap-x-5 gap-y-1">
              <p className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                ₹<CountUp key={Math.round(summary?.revenue || 0)} to={Math.round(summary?.revenue || 0)} />
              </p>
              <p className="pb-1.5 text-sm text-white/70">
                across {summary?.ordersBilled || 0} order{summary?.ordersBilled === 1 ? "" : "s"}
              </p>
            </div>

            <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {heroMetrics.map(([label, value]) => (
                <div key={label} className="rounded-3xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
                  <p className="text-2xl font-semibold tracking-tight text-white">
                    <CountUp key={value} to={value} />
                  </p>
                  <p className="mt-0.5 text-[11px] uppercase tracking-[0.14em] text-white/60">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Reveal>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {BOXES.map(([key, label], index) => {
          const meta = BOX_META[key] || {};
          const value =
            key === "feedbackScore"
              ? (summary?.[key] ? Number(summary[key]).toFixed(1) : "—")
              : summary?.[key] ?? 0;
          return (
            <Reveal key={key} delay={(index % 4) * 80} className="h-full">
              <StatTile
                label={label}
                value={value}
                tone={meta.tone}
                icon={<Icon name={meta.icon} className="h-4 w-4" />}
              />
            </Reveal>
          );
        })}
      </div>

      <Reveal delay={80}>
        <Card className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-purple">Activity</p>
              <p className="text-sm font-semibold text-ink">Last 7 days</p>
            </div>
            <Badge tone="purple">Orders &amp; scans</Badge>
          </div>
          {trend.length ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                  <defs>
                    <linearGradient id="dashBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" />
                      <stop offset="100%" stopColor="#c4b5fd" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ececf4" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6b6b80" }} stroke="#e4e4ef" tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#6b6b80" }} stroke="#e4e4ef" tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: "rgba(109,40,217,0.06)" }}
                    contentStyle={{
                      borderRadius: 16,
                      border: "1px solid #e4e4ef",
                      boxShadow: "0 18px 40px -18px rgba(109,40,217,0.35)",
                      background: "#fff",
                      fontSize: 12,
                      padding: "8px 12px"
                    }}
                    labelStyle={{ color: "#121218", fontWeight: 600, marginBottom: 4 }}
                    itemStyle={{ color: "#3b3b4d" }}
                  />
                  <Bar dataKey="orders" name="Orders" fill="url(#dashBar)" radius={[6, 6, 0, 0]} maxBarSize={34} />
                  <Line
                    type="monotone"
                    dataKey="visits"
                    name="Scans"
                    stroke="#6d28d9"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted">No activity in the last week yet.</p>
          )}
        </Card>
      </Reveal>

      <Reveal delay={120}>
        <Card className="overflow-hidden p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-purple">Quick access</p>
              <p className="text-sm font-semibold text-ink">Every counter tool in one place</p>
            </div>
            <Badge tone="purple">{tiles.length} modules</Badge>
          </div>
          <div className="divide-y divide-line">
            {tiles.map(([label, text, to], index) => (
              <Link
                key={to}
                to={to}
                className="q-fade-up group flex items-center gap-3 px-5 py-3.5 transition-colors duration-200 hover:bg-raised"
                style={{ animationDelay: `${index * 45}ms` }}
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-lavender text-purple transition-colors duration-300 group-hover:bg-purple group-hover:text-white">
                  <Icon name={TILE_ICONS[to] || "grid"} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{label}</p>
                  <p className="truncate text-xs text-muted">{text}</p>
                </div>
                <Icon
                  name="chevron"
                  className="h-4 w-4 shrink-0 text-muted transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-purple"
                />
              </Link>
            ))}
          </div>
        </Card>
      </Reveal>
    </div>
  );
}
