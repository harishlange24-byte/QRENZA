import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "react-toastify";
import { getAnalytics } from "../../api/crm";
import { getErrorMessage } from "../../api/client";
import { Alert, Button, Card, Empty, PageTitle } from "../../components/ui";
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
    <div className="space-y-4">
      <PageTitle title="Analytics" subtitle="Scans, returning customers and reward movement" />
      <Alert>{error}</Alert>

      <div className="flex flex-wrap gap-2">
        {RANGES.map(([value, label]) => (
          <Button key={value} variant={days === value ? "primary" : "ghost"} onClick={() => setDays(value)}>
            {label}
          </Button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="text-center">
          <p className="text-2xl font-semibold text-ink">{data?.totalEvents ?? 0}</p>
          <p className="text-xs text-muted">scans in range</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-semibold text-ink">{data?.returningCustomers ?? 0}</p>
          <p className="text-xs text-muted">returning customers</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-semibold text-purple">{data ? `${data.rewardRedemptionRate}%` : "—"}</p>
          <p className="text-xs text-muted">rewards redeemed</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-semibold text-ink">{data?.feedbackScore ? Number(data.feedbackScore).toFixed(1) : "—"}</p>
          <p className="text-xs text-muted">feedback score</p>
        </Card>
      </div>

      <Card className="space-y-3">
        <p className="text-sm font-semibold text-ink">Scans per day</p>
        {series.length ? (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e7ef" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#6b7280" interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} stroke="#6b7280" allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="visits" name="Scans" fill="#7C3AED" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-muted">No chart data yet.</p>
        )}
      </Card>
    </div>
  );
}
