import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { callNext, getMerchantQueue, serveEntry, skipEntry } from "../../api/queue";
import { getErrorMessage } from "../../api/client";
import { joinStoreRoom } from "../../lib/socket";
import { Alert, Button, Card, Empty, PageTitle } from "../../components/ui";
import { useMerchantStore } from "../../context/MerchantStoreContext";

const STATUS_TONE = {
  CALLED: "bg-purple text-white",
  SERVING: "bg-purple text-white",
  WAITING: "bg-lavender text-ink"
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
      <PageTitle title="Queue desk" subtitle="Customers scan your QR, take a token and wait for their turn" />
      <Alert>{error}</Alert>

      <Card className="grid grid-cols-2 gap-4 text-center sm:grid-cols-4">
        <div>
          <p className="text-3xl font-semibold text-purple">{nowServing ? `#${nowServing.tokenNumber}` : "—"}</p>
          <p className="text-xs text-muted">now serving</p>
        </div>
        <div>
          <p className="text-3xl font-semibold text-ink">{waiting}</p>
          <p className="text-xs text-muted">waiting</p>
        </div>
        <div>
          <p className="text-3xl font-semibold text-ink">{queue?.counts?.servedToday ?? 0}</p>
          <p className="text-xs text-muted">served today</p>
        </div>
        <div>
          <p className="text-3xl font-semibold text-ink">{queue?.averageServiceMinutes ?? 0}m</p>
          <p className="text-xs text-muted">avg per person</p>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button variant="accent" onClick={doCall}>Call next</Button>
        <Button variant="ghost" onClick={load}>Refresh</Button>
      </div>

      {!entries.length ? <Empty title="Queue is empty" text="As soon as a customer takes a token it shows up here." /> : null}

      {entries.map((e) => (
        <Card key={e._id} className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-lg font-bold text-ink">
              #{e.tokenNumber} <span className="text-base font-medium">{e.customerName}</span>
            </p>
            <p className="text-xs text-muted">{e.customerPhone}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${STATUS_TONE[e.status] || "bg-raised text-muted"}`}>
              {e.status}
            </span>
            <Button onClick={() => move(e, "serve")}>Serve</Button>
            <Button variant="ghost" onClick={() => move(e, "skip")}>Skip</Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
