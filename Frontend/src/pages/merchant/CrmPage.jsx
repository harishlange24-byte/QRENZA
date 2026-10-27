import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { getCrmCustomers, getCrmStats, getCustomerProfile } from "../../api/crm";
import { getErrorMessage } from "../../api/client";
import { Alert, Badge, Button, Card, Empty, inputClass, PageTitle, StatTile } from "../../components/ui";
import { Icon } from "../../components/icons";
import { Reveal } from "../../components/motion";
import { useMerchantStore } from "../../context/MerchantStoreContext";

const STAT_BOXES = [
  ["totalCustomers", "customers", "purple", "users"],
  ["activeCustomers", "active", "mint", "shield"],
  ["inactiveCustomers", "blocked", "rose", "bell"],
  ["newCustomers", "new this month", "amber", "spark"],
  ["visits", "visits", "purple", "chart"],
  ["rewardClaims", "rewards claimed", "mint", "reward"]
];

const segmentOf = (customer) => {
  if (customer.status === "BLOCKED") return { tone: "rose", label: "blocked" };
  if ((customer.totalStampsEarned || 0) >= 10) return { tone: "purple", label: "regular" };
  return { tone: "mint", label: "active" };
};

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
    <div className="space-y-6">
      <Reveal>
        <PageTitle
          eyebrow="Customers"
          title="Customer CRM"
          subtitle="Who visits, who went quiet, and what they collected"
        />
      </Reveal>

      <Alert>{error}</Alert>

      {stats ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {STAT_BOXES.map(([key, label, tone, icon], index) => (
            <Reveal key={key} delay={(index % 6) * 60} className="h-full">
              <StatTile
                label={label}
                value={stats[key] ?? 0}
                tone={tone}
                icon={<Icon name={icon} className="h-4 w-4" />}
              />
            </Reveal>
          ))}
        </div>
      ) : null}

      <Reveal delay={80}>
        <Card className="flex flex-wrap items-center gap-2">
          <input
            className={`${inputClass} sm:max-w-xs`}
            placeholder="Search name or phone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button variant="ghost" onClick={() => load(search)}>Search</Button>
          <Button variant="ghost" onClick={() => { setSearch(""); load(""); }}>Reset</Button>
        </Card>
      </Reveal>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-purple">Customers</p>
            <Badge tone="neutral">{customers.length} listed</Badge>
          </div>

          {!customers.length ? (
            <Empty title="No customers yet" text="A customer appears once they scan your store." />
          ) : (
            <div className="grid gap-3">
              {customers.map((c) => {
                const segment = segmentOf(c);
                return (
                  <Card key={c._id} hover className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-lavender font-semibold text-purple">
                        {(c.name || c.phone || "?").charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-semibold text-ink">{c.name || c.phone}</p>
                          <Badge tone={segment.tone}>{segment.label}</Badge>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted">
                          {c.phone} · {c.stamps}/{c.totalStampsEarned} stamps
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => openProfile(c)}>Profile</Button>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-purple">Profile</p>
          </div>

          {!profile ? (
            <Empty title="No customer selected" text="Tap Profile on a customer to see their history." />
          ) : (
            <>
              <Card halo className="relative overflow-hidden">
                <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-lavender/70 blur-3xl" />
                <div className="relative flex items-center gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(135deg,#3b0f8f,#8b5cf6)] text-lg font-bold text-white shadow-glow">
                    {(profile.name || profile.phone || "?").charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold text-ink">{profile.name || profile.phone}</p>
                    <p className="truncate text-xs text-muted">
                      {profile.phone}{profile.email ? ` · ${profile.email}` : ""}
                    </p>
                  </div>
                </div>

                <div className="relative mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-2xl bg-raised p-3">
                    <p className="text-lg font-semibold text-ink">{profile.visits ?? 0}</p>
                    <p className="text-[11px] uppercase tracking-[0.12em] text-muted">visits</p>
                  </div>
                  <div className="rounded-2xl bg-raised p-3">
                    <p className="text-lg font-semibold text-ink">{profile.stamps ?? 0}</p>
                    <p className="text-[11px] uppercase tracking-[0.12em] text-muted">stamps</p>
                  </div>
                  <div className="min-w-0 rounded-2xl bg-raised p-3">
                    <p className="truncate text-xs font-semibold text-ink">
                      {profile.lastVisit ? new Date(profile.lastVisit).toLocaleDateString() : "—"}
                    </p>
                    <p className="text-[11px] uppercase tracking-[0.12em] text-muted">last visit</p>
                  </div>
                </div>
              </Card>

              <Card className="space-y-2">
                <div className="flex items-center gap-2">
                  <Icon name="stamp" className="h-4 w-4 text-purple" />
                  <p className="text-sm font-semibold text-ink">Recent stamps</p>
                </div>
                {!(profile.transactions || []).length ? (
                  <p className="text-xs text-muted">No stamp history yet</p>
                ) : (
                  (profile.transactions || []).slice(0, 8).map((t) => (
                    <div key={t._id} className="flex justify-between gap-3 border-t border-line pt-2 text-sm text-muted first:border-0 first:pt-0">
                      <span className="truncate">{t.type}{t.note ? ` · ${t.note}` : ""}</span>
                      <span className="shrink-0 text-ink">{new Date(t.createdAt).toLocaleDateString()}</span>
                    </div>
                  ))
                )}
              </Card>

              <Card className="space-y-2">
                <div className="flex items-center gap-2">
                  <Icon name="reward" className="h-4 w-4 text-purple" />
                  <p className="text-sm font-semibold text-ink">Rewards</p>
                </div>
                {!(profile.rewardClaims || []).length ? (
                  <p className="text-xs text-muted">No rewards claimed yet</p>
                ) : (
                  (profile.rewardClaims || []).map((r) => (
                    <div key={r._id} className="flex justify-between gap-3 border-t border-line pt-2 text-sm text-muted first:border-0 first:pt-0">
                      <span className="truncate font-mono text-xs">{r.code}</span>
                      <Badge tone={r.status === "USED" || r.status === "REDEEMED" ? "neutral" : "mint"}>
                        {r.status.toLowerCase()}
                      </Badge>
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
