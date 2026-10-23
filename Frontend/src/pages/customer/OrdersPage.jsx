import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { cancelMyOrder, getMyOrders } from "../../api/order";
import { getErrorMessage } from "../../api/client";
import { joinStoreRoom } from "../../lib/socket";
import { Alert, Button, Card, Empty, PageTitle } from "../../components/ui";

const STATUS_LABEL = {
  PLACED: "Sent to the kitchen",
  ACCEPTED: "Kitchen accepted it",
  PREPARING: "Being prepared",
  READY: "Ready, collect it at the counter",
  SERVED: "Served",
  CANCELLED: "Cancelled"
};

const STATUS_TONE = {
  PLACED: "bg-purple text-white",
  ACCEPTED: "bg-lavender text-ink",
  PREPARING: "bg-lavender text-ink",
  READY: "bg-raised text-ink",
  SERVED: "bg-raised text-muted",
  CANCELLED: "bg-raised text-muted"
};

// The happy path an order walks through, used for the small progress strip.
const STEPS = ["PLACED", "ACCEPTED", "PREPARING", "READY", "SERVED"];

function minutesLeft(order, now) {
  if (["READY", "SERVED", "CANCELLED"].includes(order.status)) return 0;
  return Math.max(0, Math.ceil((new Date(order.estimatedReadyAt).getTime() - now) / 60000));
}

export default function OrdersPage() {
  const { code } = useParams();
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const phone = sessionStorage.getItem(`qrenzaOrderPhone_${code}`) || "";

  async function load() {
    try {
      const { data } = await getMyOrders(code, phone);
      setOrders(data.data?.orders || []);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  useEffect(() => {
    load();
    const s = joinStoreRoom(code);
    s.on("order:update", load);
    return () => s.off("order:update", load);
  }, [code, phone]);

  // The wait time keeps counting down on screen even without a new event.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 20000);
    return () => clearInterval(timer);
  }, []);

  function cancelOrder(orderId) {
    cancelMyOrder(code, orderId, phone)
      .then(load)
      .catch((e) => setError(getErrorMessage(e)));
  }

  return (
    <div className="space-y-4">
      <PageTitle title="My orders" subtitle="Live status straight from the kitchen" />
      <Alert>{error}</Alert>
      {orders.length === 0 && !error ? (
        <Empty title="No orders yet" text="Order from the menu and it will show up here." />
      ) : null}

      {orders.map((order) => {
        const left = minutesLeft(order, now);
        const canCancel = ["PLACED", "ACCEPTED"].includes(order.status);
        const stepIndex = STEPS.indexOf(order.status);
        const items = order.items.reduce((sum, line) => sum + line.quantity, 0);

        return (
          <Card key={order.id} className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-ink">{STATUS_LABEL[order.status] || order.status}</p>
                <p className="text-xs text-muted">
                  {items} {items === 1 ? "item" : "items"}
                  {order.tableNumber ? ` · Table ${order.tableNumber}` : ""}
                </p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_TONE[order.status] || "bg-raised text-ink"}`}>
                {order.status}
              </span>
            </div>

            {stepIndex >= 0 ? (
              <div className="flex items-center gap-1">
                {STEPS.map((step, i) => (
                  <span
                    key={step}
                    className={`h-1.5 flex-1 rounded-full ${i <= stepIndex ? "bg-purple" : "bg-raised"}`}
                  />
                ))}
              </div>
            ) : null}

            {left > 0 && order.status !== "READY" ? (
              <p className="text-sm text-ink">
                Ready in about <span className="font-bold text-purple">{left} min</span>
              </p>
            ) : null}

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

            <div className="flex items-center justify-between border-t border-line pt-2 text-sm">
              <span className="text-muted">
                {order.discount > 0 ? <span className="text-purple">Saved ₹{order.discount} · </span> : null}
                Total <span className="font-bold text-ink">₹{order.total}</span>
              </span>
              {canCancel ? (
                <Button variant="ghost" onClick={() => cancelOrder(order.id)}>Cancel order</Button>
              ) : null}
            </div>
          </Card>
        );
      })}

      <Link to={`/s/${code}/menu`}><Button variant="ghost" className="w-full">Order something else</Button></Link>
    </div>
  );
}
