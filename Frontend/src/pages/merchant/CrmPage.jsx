import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { getCrmCustomers, getCrmStats, getCustomerProfile } from "../../api/crm";
import { getErrorMessage } from "../../api/client";
import { Alert, Button, Card, Empty, inputClass, PageTitle } from "../../components/ui";
import { useMerchantStore } from "../../context/MerchantStoreContext";

const STAT_BOXES = [
  ["totalCustomers", "customers"],
  ["activeCustomers", "active"],
  ["inactiveCustomers", "blocked"],
  ["newCustomers", "new this month"],
  ["visits", "visits"],
  ["rewardClaims", "rewards claimed"]
];

export default function CrmPage() {
  const { storeId } = useMerchantStore();
  const [stats, setStats] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [profile, setProfile] = useState(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  async function load(query = "") {
    if (!storeId) return;
    try {
      const [s, c] = await Promise.all([getCrmStats(storeId), getCrmCustomers(storeId, query)]);
      setStats(s.data.data?.stats || null);
      setCustomers(c.data.data?.customers || []);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  useEffect(() => {
    load();
  }, [storeId]);

  async function openProfile(customer) {
    try {
      const { data } = await getCustomerProfile(storeId, customer._id);
      setProfile(data.data?.customer || null);
    } catch (e) {
      setError(getErrorMessage(e));
      toast.error(getErrorMessage(e));
    }
  }

  if (!storeId) {
    return <Empty title="Pick a store" text="Select a store from the sidebar to see its customers." />;
  }

  return (
    <div className="space-y-4">
      <PageTitle title="Customer CRM" subtitle="Who visits, who went quiet, and what they collected" />
      <Alert>{error}</Alert>

      {stats ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {STAT_BOXES.map(([key, label]) => (
            <Card key={key} className="text-center">
              <p className="text-2xl font-semibold text-ink">{stats[key] ?? 0}</p>
              <p className="text-xs text-muted">{label}</p>
            </Card>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <input
          className={`${inputClass} sm:max-w-xs`}
          placeholder="Search name or phone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button variant="ghost" onClick={() => load(search)}>Search</Button>
        <Button variant="ghost" onClick={() => { setSearch(""); load(""); }}>Reset</Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          {!customers.length ? <Empty title="No customers yet" text="A customer appears once they scan your store." /> : null}
          {customers.map((c) => (
            <Card key={c._id} className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-ink">{c.name || c.phone}</p>
                <p className="text-xs text-muted">
                  {c.phone} · {c.stamps}/{c.totalStampsEarned} stamps
                  {c.status === "BLOCKED" ? " · blocked" : ""}
                </p>
              </div>
              <Button variant="ghost" onClick={() => openProfile(c)}>Profile</Button>
            </Card>
          ))}
        </div>

        <div className="space-y-3">
          <PageTitle title="Profile" />
          {!profile ? (
            <Empty title="No customer selected" text="Tap Profile on a customer to see their history." />
          ) : (
            <>
              <Card className="space-y-1">
                <p className="text-lg font-semibold text-ink">{profile.name || profile.phone}</p>
                <p className="text-xs text-muted">{profile.phone}{profile.email ? ` · ${profile.email}` : ""}</p>
                <p className="mt-2 text-sm text-muted">
                  Visits <span className="font-semibold text-ink">{profile.visits ?? 0}</span> · Stamps{" "}
                  <span className="font-semibold text-ink">{profile.stamps ?? 0}</span>
                  {profile.lastVisit ? ` · last ${new Date(profile.lastVisit).toLocaleDateString()}` : ""}
                </p>
              </Card>

              <Card className="space-y-2">
                <p className="text-sm font-semibold text-ink">Recent stamps</p>
                {!(profile.transactions || []).length ? (
                  <p className="text-xs text-muted">No stamp history yet</p>
                ) : (
                  (profile.transactions || []).slice(0, 8).map((t) => (
                    <div key={t._id} className="flex justify-between text-sm text-muted">
                      <span>{t.type}{t.note ? ` · ${t.note}` : ""}</span>
                      <span className="text-ink">{new Date(t.createdAt).toLocaleDateString()}</span>
                    </div>
                  ))
                )}
              </Card>

              <Card className="space-y-2">
                <p className="text-sm font-semibold text-ink">Rewards</p>
                {!(profile.rewardClaims || []).length ? (
                  <p className="text-xs text-muted">No rewards claimed yet</p>
                ) : (
                  (profile.rewardClaims || []).map((r) => (
                    <div key={r._id} className="flex justify-between text-sm text-muted">
                      <span>{r.code}</span>
                      <span className="text-ink">{r.status.toLowerCase()}</span>
                    </div>
                  ))
                )}
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
