import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { listStoreOrders, updateOrderStatus } from "../../api/order";
import { getErrorMessage } from "../../api/client";
import { joinStoreRoom } from "../../lib/socket";
import { FEATURE_LABELS } from "../../lib/features";
import { Alert, Badge, Button, Card, Empty, PageTitle } from "../../components/ui";
import { Icon } from "../../components/icons";
import { Reveal } from "../../components/motion";
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
  PLACED: "amber",
  ACCEPTED: "purple",
  PREPARING: "purple",
  READY: "mint",
  SERVED: "neutral",
  CANCELLED: "rose"
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
      <Reveal>
        <PageTitle title="Order desk" subtitle="Live table orders, newest first" />
      </Reveal>
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
            <Badge tone={orderingOn ? "mint" : "neutral"}>
              {orderingOn ? "Table ordering on" : "Table ordering locked"}
            </Badge>
          </div>
          {included.length ? (
            <div className="flex flex-wrap gap-1.5">
              {included.map((label) => (
                <Badge key={label} tone="outline">{label}</Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">Start a plan to unlock ordering, stamps, queue and CRM.</p>
          )}
        </Card>
      ) : null}

      <Reveal delay={60}>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(([value, label]) => (
            <Button key={value} size="sm" variant={filter === value ? "primary" : "ghost"} onClick={() => setFilter(value)}>
              {label}
            </Button>
          ))}
          <Button size="sm" variant="accent" onClick={() => load(filter)}>
            <Icon name="spark" className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </Reveal>

      <div className="flex flex-wrap gap-2 text-sm">
        <span className="inline-flex items-center gap-2 rounded-2xl border border-line bg-panel px-3 py-2 text-muted shadow-soft">
          New <span className="font-semibold text-ink">{counts.placed || 0}</span>
        </span>
        <span className="inline-flex items-center gap-2 rounded-2xl border border-line bg-panel px-3 py-2 text-muted shadow-soft">
          In kitchen <span className="font-semibold text-ink">{counts.preparing || 0}</span>
        </span>
        <span className="inline-flex items-center gap-2 rounded-2xl border border-line bg-panel px-3 py-2 text-muted shadow-soft">
          Ready <span className="font-semibold text-ink">{counts.ready || 0}</span>
        </span>
      </div>

      {orders.length === 0 ? <Empty title="No orders" text="New table orders appear here automatically." /> : null}

      {orders.length ? (
        <div className="hidden overflow-hidden rounded-4xl border border-line bg-panel shadow-soft md:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-line bg-raised/60 text-[11px] uppercase tracking-[0.12em] text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Guest</th>
                  <th className="px-4 py-3 font-semibold">Items</th>
                  <th className="px-4 py-3 font-semibold">Total</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {orders.map((order) => {
                  const left = minutesLeft(order);
                  return (
                    <tr key={order.id} className="align-top transition-colors hover:bg-raised/50">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-ink">{order.customerName}</p>
                        <p className="text-xs text-muted">
                          {order.customerPhone}
                          {order.tableNumber ? ` · Table ${order.tableNumber}` : ""}
                        </p>
                        {order.giftCardCode ? <p className="text-xs text-purple">{order.giftCardCode}</p> : null}
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          {order.items.map((line, i) => (
                            <p key={i} className="text-muted">
                              {line.isFree ? <span className="text-purple">FREE </span> : null}
                              {line.name} × {line.quantity}
                            </p>
                          ))}
                        </div>
                        {order.note ? <p className="mt-1 text-xs text-muted">Note: {order.note}</p> : null}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-ink">₹{order.total}</p>
                        <p className="text-xs text-muted">{left > 0 ? `${left} min left` : "No wait pending"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={STATUS_TONE[order.status] || "neutral"}>{order.status}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-2">
                          {(NEXT_STEP[order.status] || []).map(([next, label]) => (
                            <Button
                              key={next}
                              size="sm"
                              variant={next === "CANCELLED" ? "ghost" : "primary"}
                              onClick={() => move(order.id, next)}
                            >
                              {label}
                            </Button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {orders.length ? (
        <div className="space-y-3 md:hidden">
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
                  <Badge tone={STATUS_TONE[order.status] || "neutral"}>{order.status}</Badge>
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
                  <div className="flex flex-wrap gap-2">
                    {(NEXT_STEP[order.status] || []).map(([next, label]) => (
                      <Button
                        key={next}
                        size="sm"
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
      ) : null}
    </div>
  );
}
