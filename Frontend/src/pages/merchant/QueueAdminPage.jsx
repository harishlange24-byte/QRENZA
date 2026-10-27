import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { callNext, getMerchantQueue, serveEntry, skipEntry } from "../../api/queue";
import { getErrorMessage } from "../../api/client";
import { joinStoreRoom } from "../../lib/socket";
import { Alert, Badge, Button, Card, Empty, PageTitle } from "../../components/ui";
import { Icon } from "../../components/icons";
import { Reveal } from "../../components/motion";
import { useMerchantStore } from "../../context/MerchantStoreContext";

const STATUS_TONE = {
  CALLED: "purple",
  SERVING: "mint",
  WAITING: "neutral"
};

export default function QueueAdminPage() {
  const { storeId } = useMerchantStore();
  const [queue, setQueue] = useState(null);
  const [error, setError] = useState("");

  async function load() {
    if (!storeId) return;
    try {
      const { data } = await getMerchantQueue(storeId);
      setQueue(data.data?.queue || null);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  useEffect(() => {
    if (!storeId) return;
    load();
    const s = joinStoreRoom(storeId);
    const onUpdate = () => load();
    s.on("queue:update", onUpdate);
    return () => s.off("queue:update", onUpdate);
  }, [storeId]);

  async function doCall() {
    try {
      const { data } = await callNext(storeId);
      const token = data.data?.entry?.tokenNumber;
      toast.success(token ? `Token ${token} called` : "Next customer called");
      load();
    } catch (e) {
      setError(getErrorMessage(e));
      toast.error(getErrorMessage(e));
    }
  }

  async function move(entry, action) {
    try {
      await (action === "serve" ? serveEntry(storeId, entry._id) : skipEntry(storeId, entry._id));
      toast.success(action === "serve" ? `Token ${entry.tokenNumber} served` : `Token ${entry.tokenNumber} skipped`);
      load();
    } catch (e) {
      setError(getErrorMessage(e));
      toast.error(getErrorMessage(e));
    }
  }

  if (!storeId) {
    return <Empty title="Pick a store" text="Select a store from the sidebar to run its queue." />;
  }

  const entries = queue?.entries || [];
  const nowServing = queue?.nowServing;
  const waiting = queue?.counts?.waiting ?? entries.filter((e) => e.status === "WAITING").length;

  return (
    <div className="space-y-4">
      <Reveal>
        <PageTitle title="Queue desk" subtitle="Customers scan your QR, take a token and wait for their turn" />
      </Reveal>
      <Alert>{error}</Alert>

      <Reveal delay={60}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="relative overflow-hidden rounded-4xl bg-[linear-gradient(135deg,#3b0f8f,#6d28d9)] p-4 text-center shadow-soft">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">now serving</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-white">
              {nowServing ? `#${nowServing.tokenNumber}` : "—"}
            </p>
          </div>
          <div className="rounded-4xl border border-line bg-panel p-4 text-center shadow-soft">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">waiting</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-ink">{waiting}</p>
          </div>
          <div className="rounded-4xl border border-line bg-panel p-4 text-center shadow-soft">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">served today</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-ink">{queue?.counts?.servedToday ?? 0}</p>
          </div>
          <div className="rounded-4xl border border-line bg-panel p-4 text-center shadow-soft">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">avg per person</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-ink">{queue?.averageServiceMinutes ?? 0}m</p>
          </div>
        </div>
      </Reveal>

      <Reveal delay={90}>
        <div className="flex flex-wrap gap-2">
          <Button variant="accent" onClick={doCall}>
            <Icon name="queue" className="h-4 w-4" />
            Call next
          </Button>
          <Button variant="ghost" onClick={load}>
            <Icon name="spark" className="h-4 w-4 text-purple" />
            Refresh
          </Button>
        </div>
      </Reveal>

      {!entries.length ? <Empty title="Queue is empty" text="As soon as a customer takes a token it shows up here." /> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {entries.map((e) => (
          <Card key={e._id} className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(135deg,#3b0f8f,#8b5cf6)] text-base font-bold text-white shadow-glow sm:text-lg">
                #{e.tokenNumber}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-bold text-ink">{e.customerName}</p>
                <p className="truncate text-xs text-muted">{e.customerPhone}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Badge tone={STATUS_TONE[e.status] || "neutral"}>{e.status}</Badge>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => move(e, "serve")}>Serve</Button>
                <Button size="sm" variant="ghost" onClick={() => move(e, "skip")}>Skip</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
