import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { listStoreOrders, updateOrderStatus } from "../../api/order";
import { getErrorMessage } from "../../api/client";
import { joinStoreRoom } from "../../lib/socket";
import { FEATURE_LABELS } from "../../lib/features";
import { Alert, Button, Card, Empty, PageTitle } from "../../components/ui";
import { useMerchantStore } from "../../context/MerchantStoreContext";
import { useAccess } from "../../context/AccessContext";

// The desk may only move an order forward, the backend enforces the same list.
const NEXT_STEP = {
  PLACED: [["ACCEPTED", "Accept"], ["CANCELLED", "Reject"]],
  ACCEPTED: [["PREPARING", "Start cooking"], ["CANCELLED", "Cancel"]],
  PREPARING: [["READY", "Mark ready"]],
  READY: [["SERVED", "Mark served"]]
};

const STATUS_TONE = {
  PLACED: "bg-purple text-white",
  ACCEPTED: "bg-lavender text-ink",
  PREPARING: "bg-lavender text-ink",
  READY: "bg-raised text-ink",
  SERVED: "bg-raised text-muted",
  CANCELLED: "bg-raised text-muted"
};

const FILTERS = [
  ["ACTIVE", "Live"],
  ["PLACED", "New"],
  ["READY", "Ready"],
  ["SERVED", "Done"],
  ["CANCELLED", "Cancelled"]
];

function minutesLeft(order) {
  if (["READY", "SERVED", "CANCELLED"].includes(order.status)) return 0;
  return Math.max(0, Math.ceil((new Date(order.estimatedReadyAt).getTime() - Date.now()) / 60000));
}

export default function OrdersAdminPage() {
  const { storeId } = useMerchantStore();
  const { access } = useAccess();
  const [orders, setOrders] = useState([]);
  const [counts, setCounts] = useState({});
  const [filter, setFilter] = useState("ACTIVE");
  const [error, setError] = useState("");

  async function load(status = filter) {
    if (!storeId) return;
    try {
      const { data } = await listStoreOrders(storeId, status);
      setOrders(data.data?.orders || []);
      setCounts(data.data?.counts || {});
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  useEffect(() => {
    if (!storeId) return;
    load(filter);
    const s = joinStoreRoom(storeId);
    const onUpdate = () => load(filter);
    s.on("order:update", onUpdate);
    return () => s.off("order:update", onUpdate);
  }, [storeId, filter]);

  function move(orderId, status) {
    updateOrderStatus(storeId, orderId, status)
      .then(() => {
        toast.success(`Order marked ${status.toLowerCase()}`);
        load(filter);
      })
      .catch((e) => {
        setError(getErrorMessage(e));
        toast.error(getErrorMessage(e));
      });
  }

  if (!storeId) {
    return <Empty title="Pick a store" text="Select a store from the sidebar to see its orders." />;
  }

  const orderingOn = Boolean(access) && access.isUsable && (access.features || []).includes("ONLINE_ORDERING");
  const planName = access?.plan?.displayName || access?.planCode || "";
  const included = (access?.features || []).map((f) => FEATURE_LABELS[f] || f);

  return (
    <div className="space-y-4">
      <PageTitle title="Order desk" subtitle="Live table orders, newest first" />
      <Alert>{error}</Alert>

      {access ? (
        <Card className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-purple">Your current plan</p>
              <p className="text-lg font-semibold text-ink">
                {planName || "No plan selected"}
                {access.status ? <span className="ml-2 text-xs font-medium text-muted">· {access.status}</span> : null}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase ${
                orderingOn ? "bg-lavender text-ink" : "bg-raised text-muted"
              }`}
            >
              {orderingOn ? "Table ordering on" : "Table ordering locked"}
            </span>
          </div>
          {included.length ? (
            <div className="flex flex-wrap gap-1.5">
              {included.map((label) => (
                <span key={label} className="rounded-full border border-line bg-raised px-2 py-0.5 text-[11px] text-muted">
                  {label}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">Start a plan to unlock ordering, stamps, queue and CRM.</p>
          )}
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map(([value, label]) => (
          <Button key={value} variant={filter === value ? "primary" : "ghost"} onClick={() => setFilter(value)}>
            {label}
          </Button>
        ))}
        <Button variant="accent" onClick={() => load(filter)}>Refresh</Button>
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-muted">
        <span>New <span className="font-semibold text-ink">{counts.placed || 0}</span></span>
        <span>In kitchen <span className="font-semibold text-ink">{counts.preparing || 0}</span></span>
        <span>Ready <span className="font-semibold text-ink">{counts.ready || 0}</span></span>
      </div>

      {orders.length === 0 ? <Empty title="No orders" text="New table orders appear here automatically." /> : null}

      {orders.map((order) => {
        const left = minutesLeft(order);
        return (
          <Card key={order.id} className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-ink">{order.customerName}</p>
                <p className="text-xs text-muted">
                  {order.customerPhone}
                  {order.tableNumber ? ` · Table ${order.tableNumber}` : ""}
                </p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_TONE[order.status] || "bg-raised text-ink"}`}>
                {order.status}
              </span>
            </div>

            <div className="space-y-1 border-t border-line pt-2 text-sm">
              {order.items.map((line, i) => (
                <div key={i} className="flex justify-between text-muted">
                  <span>
                    {line.isFree ? <span className="text-purple">FREE </span> : null}
                    {line.name} × {line.quantity}
                  </span>
                  <span className="text-ink">₹{line.price * line.quantity}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2">
              <div className="text-sm">
                <span className="text-muted">
                  {left > 0 ? `${left} min left` : "No wait pending"}
                  {order.giftCardCode ? ` · ${order.giftCardCode}` : ""}
                </span>
                <span className="ml-2 font-bold text-ink">₹{order.total}</span>
              </div>
              <div className="flex gap-2">
                {(NEXT_STEP[order.status] || []).map(([next, label]) => (
                  <Button
                    key={next}
                    variant={next === "CANCELLED" ? "ghost" : "primary"}
                    onClick={() => move(order.id, next)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            {order.note ? <p className="text-xs text-muted">Note: {order.note}</p> : null}
          </Card>
        );
      })}
    </div>
  );
}
