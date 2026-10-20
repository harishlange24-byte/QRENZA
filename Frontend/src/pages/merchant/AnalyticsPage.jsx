import { useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getAnalytics } from "../../api/crm";
import { getErrorMessage } from "../../api/client";
import { Alert, Button, Card, PageTitle } from "../../components/ui";
import { useMerchantStore } from "../../context/MerchantStoreContext";

export default function AnalyticsPage() {
  const { storeId } = useMerchantStore();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  async function load() {
    try {
      const res = await getAnalytics(storeId);
      setData(res.data.analytics || res.data);
    } catch (e) { setError(getErrorMessage(e)); }
  }

  const series = data?.dailyVisits || [];

  return (
    <div className="space-y-4">
      <PageTitle title="Analytics" />
      <Alert>{error}</Alert>
      <Button onClick={load}>Load</Button>
      <div className="grid gap-3 md:grid-cols-3">
        <Card><p className="text-xs">Returning customers</p><p className="text-2xl font-bold">{data?.returningCustomers ?? "-"}</p></Card>
        <Card><p className="text-xs">Reward redemption</p><p className="text-2xl font-bold">{data?.rewardRedemptionRate ?? "-"}</p></Card>
        <Card><p className="text-xs">Feedback score</p><p className="text-2xl font-bold">{data?.feedbackScore ?? "-"}</p></Card>
      </div>
      <Card className="h-64">
        {series.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="visits" stroke="#7C3AED" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        ) : <p className="text-sm text-muted">No chart data yet.</p>}
      </Card>
    </div>
  );
}
