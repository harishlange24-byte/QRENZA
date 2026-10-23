import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { cancelSupplyOrder, createSupplyOrder, listSupplyCatalog, listSupplyOrders } from "../../api/supply";
import { getErrorMessage } from "../../api/client";
import { supplyOrderSchema } from "../../lib/schemas";
import { FEATURE_LABELS } from "../../lib/features";
import { Alert, Button, Card, Empty, Field, inputClass, PageTitle } from "../../components/ui";
import { useMerchantStore } from "../../context/MerchantStoreContext";
import { useAccess } from "../../context/AccessContext";

// The catalogue prices arrive in paise, like every other Qrenza bill.
const rupees = (paise) => Math.round(paise) / 100;

export default function SuppliesPage() {
  const { storeId } = useMerchantStore();
  const { access } = useAccess();
  const user = useSelector((s) => s.auth.user);
  const [products, setProducts] = useState([]);
  const [shipping, setShipping] = useState(0);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const form = useForm({
    resolver: zodResolver(supplyOrderSchema),
    defaultValues: { contactPhone: user?.phone || "" }
  });

  async function loadCatalog() {
    try {
      const { data } = await listSupplyCatalog();
      setProducts(data.data?.products || []);
      setShipping(data.data?.shipping || 0);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  async function loadOrders() {
    try {
      const { data } = await listSupplyOrders();
      setOrders(data.data?.orders || []);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  useEffect(() => {
    loadCatalog();
    loadOrders();
  }, []);

  const qtyOf = (id) => cart.find((l) => l.productId === id)?.quantity || 0;

  function setQty(product, quantity) {
    setCart((current) => {
      const next = current
        .map((l) => (l.productId === product.id ? { ...l, quantity } : l))
        .filter((l) => l.quantity > 0);
      if (quantity > 0 && !current.some((l) => l.productId === product.id)) {
        next.push({ productId: product.id, name: product.name, price: product.price, quantity });
      }
      return next;
    });
  }

  const subtotal = cart.reduce((sum, l) => sum + l.price * l.quantity, 0);
  const total = cart.length ? subtotal + shipping : 0;

  async function submit(values) {
    if (!cart.length) {
      toast.error("Add at least one supply first");
      return;
    }
    try {
      await createSupplyOrder({
        items: cart.map((l) => ({ productId: l.productId, quantity: l.quantity })),
        contactName: values.contactName,
        contactPhone: values.contactPhone,
        deliveryAddress: values.deliveryAddress,
        note: values.note || "",
        storeId: storeId || undefined
      });
      toast.success("Supply order placed");
      setCart([]);
      form.reset({ contactPhone: values.contactPhone });
      setError("");
      loadOrders();
    } catch (e) {
      setError(getErrorMessage(e));
      toast.error(getErrorMessage(e));
    }
  }

  async function cancel(orderId) {
    try {
      await cancelSupplyOrder(orderId);
      toast.success("Order cancelled");
      loadOrders();
    } catch (e) {
      setError(getErrorMessage(e));
      toast.error(getErrorMessage(e));
    }
  }

  const included = (access?.features || []).map((f) => FEATURE_LABELS[f] || f);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <PageTitle title="Supplies" subtitle="Printed QR standees, table tents and stickers" />
        <Alert>{error}</Alert>

        <Card className="mb-4 space-y-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-purple">Your plan</p>
            <p className="text-lg font-semibold text-ink">
              {access?.plan?.displayName || access?.planCode || "No plan selected"}
            </p>
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
            <p className="text-sm text-muted">Start a plan to unlock more of Qrenza.</p>
          )}
          <p className="text-xs text-muted">
            Standees and stickers are billed once, delivery is a flat ₹{rupees(shipping || 4900)} per order.
          </p>
        </Card>

        <div className="space-y-3">
          {products.map((product) => (
            <Card key={product.id} className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-ink">{product.name}</p>
                <p className="text-sm text-muted">{product.description}</p>
                <p className="mt-1 text-sm font-bold text-purple">₹{rupees(product.price)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="h-8 w-8 rounded-xl border border-line text-ink"
                  onClick={() => setQty(product, qtyOf(product.id) - 1)}
                >
                  −
                </button>
                <span className="w-4 text-center text-sm font-semibold text-ink">{qtyOf(product.id)}</span>
                <button
                  className="h-8 w-8 rounded-xl border border-line text-ink"
                  onClick={() => setQty(product, qtyOf(product.id) + 1)}
                >
                  +
                </button>
              </div>
            </Card>
          ))}
        </div>

        <Card className="mt-4">
          <p className="mb-3 text-sm font-semibold text-ink">Delivery details</p>
          <form className="space-y-3" onSubmit={form.handleSubmit(submit)}>
            <Field label="Contact name" error={form.formState.errors.contactName?.message}>
              <input className={inputClass} {...form.register("contactName")} />
            </Field>
            <Field label="Contact phone" error={form.formState.errors.contactPhone?.message}>
              <input className={inputClass} maxLength={10} {...form.register("contactPhone")} />
            </Field>
            <Field label="Delivery address" error={form.formState.errors.deliveryAddress?.message}>
              <input className={inputClass} {...form.register("deliveryAddress")} />
            </Field>
            <Field label="Note (optional)">
              <input className={inputClass} {...form.register("note")} />
            </Field>

            <div className="rounded-2xl bg-raised p-3 text-sm">
              <div className="flex justify-between text-muted">
                <span>Items</span>
                <span>₹{rupees(subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Delivery</span>
                <span>₹{rupees(cart.length ? shipping : 0)}</span>
              </div>
              <div className="mt-1 flex justify-between font-bold text-ink">
                <span>Total</span>
                <span className="text-purple">₹{rupees(total)}</span>
              </div>
            </div>

            <Button className="w-full">Place supply order</Button>
          </form>
        </Card>
      </div>

      <div className="space-y-3">
        <PageTitle title="Past supply orders" subtitle={`${orders.length} order${orders.length === 1 ? "" : "s"}`} />
        {!orders.length ? <Empty title="No supply orders" text="Order a standee and it will show up here." /> : null}
        {orders.map((order) => (
          <Card key={order.id} className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-ink">
                  {order.items.reduce((n, l) => n + l.quantity, 0)} item
                  {order.items.reduce((n, l) => n + l.quantity, 0) === 1 ? "" : "s"}
                </p>
                <p className="text-xs text-muted">
                  {new Date(order.createdAt).toLocaleDateString()} · {order.contactName} · {order.contactPhone}
                </p>
              </div>
              <span
                className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${
                  order.status === "REQUESTED" ? "bg-lavender text-ink" : "bg-raised text-muted"
                }`}
              >
                {order.status.toLowerCase()}
              </span>
            </div>
            <div className="space-y-1 border-t border-line pt-2 text-sm">
              {order.items.map((l, i) => (
                <div key={i} className="flex justify-between text-muted">
                  <span>{l.name} × {l.quantity}</span>
                  <span className="text-ink">₹{rupees(l.price * l.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-line pt-2">
              <p className="text-sm text-muted">
                Delivery ₹{rupees(order.shipping)} · Total <span className="font-bold text-ink">₹{rupees(order.total)}</span>
              </p>
              {order.status === "REQUESTED" ? (
                <Button variant="ghost" onClick={() => cancel(order.id)}>Cancel</Button>
              ) : null}
            </div>
            {order.deliveryAddress ? <p className="text-xs text-muted">To: {order.deliveryAddress}</p> : null}
          </Card>
        ))}
      </div>
    </div>
  );
}
