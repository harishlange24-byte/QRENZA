import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "react-toastify";
import { getAnalytics } from "../../api/crm";
import { getErrorMessage } from "../../api/client";
import { Alert, Badge, Button, Card, Empty, PageTitle, StatTile } from "../../components/ui";
import { Icon } from "../../components/icons";
import { Reveal } from "../../components/motion";
import { useMerchantStore } from "../../context/MerchantStoreContext";

const RANGES = [
  [7, "7 days"],
  [30, "30 days"],
  [90, "90 days"]
];

export default function AnalyticsPage() {
  const { storeId } = useMerchantStore();
  const [data, setData] = useState(null);
  const [days, setDays] = useState(30);
  const [error, setError] = useState("");

  async function load(range = days) {
    if (!storeId) return;
    try {
      const res = await getAnalytics(storeId, range);
      setData(res.data.data?.analytics || null);
    } catch (e) {
      setError(getErrorMessage(e));
      toast.error(getErrorMessage(e));
    }
  }

  useEffect(() => {
    load(days);
  }, [storeId, days]);

  if (!storeId) {
    return <Empty title="Pick a store" text="Select a store from the sidebar to see its analytics." />;
  }

  const series = data?.dailyVisits || [];

  return (
    <div className="space-y-6">
      <Reveal>
        <PageTitle
          eyebrow="Insights"
          title="Analytics"
          subtitle="Scans, returning customers and reward movement"
        />
      </Reveal>

      <Alert>{error}</Alert>

      <Reveal delay={80}>
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-purple">Date range</p>
            <p className="mt-0.5 text-xs text-muted">Pick how far back to look.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {RANGES.map(([value, label]) => (
              <Button key={value} size="sm" variant={days === value ? "primary" : "ghost"} onClick={() => setDays(value)}>
                {label}
              </Button>
            ))}
          </div>
        </Card>
      </Reveal>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Reveal>
          <StatTile
            label="scans in range"
            value={data?.totalEvents ?? 0}
            tone="purple"
            icon={<Icon name="chart" className="h-4 w-4" />}
          />
        </Reveal>
        <Reveal delay={80}>
          <StatTile
            label="returning customers"
            value={data?.returningCustomers ?? 0}
            tone="mint"
            icon={<Icon name="users" className="h-4 w-4" />}
          />
        </Reveal>
        <Reveal delay={160}>
          <StatTile
            label="rewards redeemed"
            value={data ? `${data.rewardRedemptionRate}%` : "—"}
            tone="amber"
            icon={<Icon name="reward" className="h-4 w-4" />}
          />
        </Reveal>
        <Reveal delay={240}>
          <StatTile
            label="feedback score"
            value={data?.feedbackScore ? Number(data.feedbackScore).toFixed(1) : "—"}
            tone="ink"
            icon={<Icon name="stamp" className="h-4 w-4" />}
          />
        </Reveal>
      </div>

      <Reveal delay={80}>
        <Card className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-purple">Activity</p>
              <p className="text-sm font-semibold text-ink">Scans per day</p>
            </div>
            <Badge tone="purple">{RANGES.find(([value]) => value === days)?.[1]}</Badge>
          </div>

          {series.length ? (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                  <defs>
                    <linearGradient id="qrenzaScanBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6d28d9" />
                      <stop offset="100%" stopColor="#c4b5fd" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4ef" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#6b6b80" interval="preserveStartEnd" tickMargin={8} />
                  <YAxis tick={{ fontSize: 11 }} stroke="#6b6b80" allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: "rgba(109,40,217,0.06)" }}
                    contentStyle={{
                      borderRadius: 16,
                      border: "1px solid #e4e4ef",
                      boxShadow: "0 12px 30px -12px rgba(59,15,143,0.25)",
                      fontSize: 12
                    }}
                  />
                  <Bar dataKey="visits" name="Scans" fill="url(#qrenzaScanBar)" radius={[8, 8, 0, 0]} maxBarSize={38} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="rounded-2xl bg-raised px-4 py-10 text-center text-sm text-muted">No chart data yet.</p>
          )}
        </Card>
      </Reveal>
    </div>
  );
}
