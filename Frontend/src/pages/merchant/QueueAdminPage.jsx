import { useEffect, useState } from "react";
import { callNext, getMerchantQueue, serveEntry, skipEntry } from "../../api/queue";
import { getErrorMessage } from "../../api/client";
import { joinStoreRoom } from "../../lib/socket";
import { Alert, Button, Card, PageTitle } from "../../components/ui";
import { useMerchantStore } from "../../context/MerchantStoreContext";

export default function QueueAdminPage() {
  const { storeId } = useMerchantStore();
  const [queue, setQueue] = useState(null);
  const [error, setError] = useState("");

  async function load() {
    if (!storeId) return;
    try {
      const { data } = await getMerchantQueue(storeId);
      setQueue(data.queue || data);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  useEffect(() => {
    if (!storeId) return;
    load();
    const s = joinStoreRoom(storeId);
    s.on("queue:update", load);
    return () => s.off("queue:update", load);
  }, [storeId]);

  const entries = queue?.entries || [];

  return (
    <div className="space-y-4">
      <PageTitle title="Queue desk" />
      <Alert>{error}</Alert>
      <div className="flex gap-2">
        <Button onClick={load}>Load</Button>
        <Button variant="accent" onClick={() => callNext(storeId).then(load)}>Call next</Button>
      </div>
      {entries.map((e) => (
        <Card key={e._id} className="flex items-center justify-between">
          <div>
            <p className="font-bold">#{e.tokenNumber} {e.customerName}</p>
            <p className="text-xs">{e.status} · {e.customerPhone}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => serveEntry(storeId, e._id).then(load)}>Serve</Button>
            <Button variant="ghost" onClick={() => skipEntry(storeId, e._id).then(load)}>Skip</Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
