import { useState } from "react";
import { getCrmCustomers, getCrmStats, getCustomerProfile } from "../../api/crm";
import { getErrorMessage } from "../../api/client";
import { Alert, Button, Card, PageTitle } from "../../components/ui";
import { useMerchantStore } from "../../context/MerchantStoreContext";

export default function CrmPage() {
  const { storeId } = useMerchantStore();
  const [stats, setStats] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");

  async function load() {
    try {
      const [s, c] = await Promise.all([getCrmStats(storeId), getCrmCustomers(storeId)]);
      setStats(s.data.stats || s.data);
      setCustomers(c.data.customers || []);
    } catch (e) { setError(getErrorMessage(e)); }
  }

  return (
    <div className="space-y-4">
      <PageTitle title="Customer CRM" />
      <Alert>{error}</Alert>
      <Button onClick={load}>Load</Button>
      {stats ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {["totalCustomers", "activeCustomers", "inactiveCustomers", "visits"].map((k) => (
            <Card key={k}><p className="text-xs uppercase">{k}</p><p className="text-2xl font-bold">{stats[k] ?? 0}</p></Card>
          ))}
        </div>
      ) : null}
      {customers.map((c) => (
        <Card key={c._id || c.id} className="flex justify-between">
          <div>
            <p className="font-semibold">{c.name || c.phone}</p>
            <p className="text-xs">{c.phone}</p>
          </div>
          <Button variant="ghost" onClick={async () => {
            const { data } = await getCustomerProfile(storeId, c._id || c.id);
            setProfile(data.customer || data);
          }}>Profile</Button>
        </Card>
      ))}
      {profile ? (
        <Card>
          <p className="font-bold">{profile.name || profile.phone}</p>
          <p className="text-sm">Visits: {profile.visits ?? "-"}</p>
          <p className="text-sm">Stamps: {profile.stamps ?? "-"}</p>
          <p className="text-sm">Last visit: {profile.lastVisit || "-"}</p>
        </Card>
      ) : null}
    </div>
  );
}
