import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cancelSupplyOrder, createSupplyOrder, listSupplyCatalog, listSupplyOrders } from "../../api/supply";
import { getErrorMessage } from "../../api/client";
import { supplyOrderSchema } from "../../lib/schemas";
import { Alert, Button, Card, Empty, Field, inputClass, PageTitle } from "../../components/ui";
import { useMerchantStore } from "../../context/MerchantStoreContext";

// The catalogue prices arrive in paise, like every other Qrenza bill.
const rupees = (paise) => Math.round(paise) / 100;

export default function SuppliesPage() {
  const { storeId } = useMerchantStore();
  const [products, setProducts] = useState([]);
  const [shipping, setShipping] = useState(0);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const form = useForm({ resolver: zodResolver(supplyOrderSchema) });

  async function loadCatalog() {
    try {
      const { data } = await listSupplyCatalog();
      setProducts(data.products || []);
      setShipping(data.shipping || 0);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  async function loadOrders() {
    try {
      const { data } = await listSupplyOrders();
      setOrders(data.orders || []);
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
    try {
      await createSupplyOrder({
        items: cart.map((l) => ({ productId: l.productId, quantity: l.quantity })),
        contactName: values.contactName,
        contactPhone: values.contactPhone,
        deliveryAddress: values.deliveryAddress,
        note: values.note || "",
        storeId: storeId || undefined
      });
      setCart([]);
      form.reset();
      setError("");
      loadOrders();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  function cancel(orderId) {
    cancelSupplyOrder(orderId)
      .then(loadOrders)
      .catch((e) => setError(getErrorMessage(e)));
  }

  return (
    <div className="space-y-4">
      <PageTitle title="Supplies" subtitle="Printed QR standees, table tents and stickers" />
      <Alert>{error}</Alert>

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

      {cart.length ? (
        <Card className="space-y-1">
          <p className="text-sm text-muted">Order summary</p>
          <p className="text-sm text-ink">Items ₹{rupees(subtotal)}</p>
          <p className="text-sm text-ink">Delivery ₹{rupees(shipping)}</p>
          <p className="text-lg font-bold text-purple">Total ₹{rupees(total)}</p>
        </Card>
      ) : null}

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
        <Button className="w-full" disabled={cart.length === 0}>Place supply order</Button>
      </form>

      <PageTitle title="Past supply orders" />
      {orders.length === 0 ? <Empty title="No supply orders" text="Order a standee and it will show up here." /> : null}
      {orders.map((order) => (
        <Card key={order.id} className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-ink">{order.status}</p>
            <p className="text-xs text-muted">
              {order.items.map((l) => `${l.name} × ${l.quantity}`).join(", ")}
            </p>
            <p className="text-sm text-muted">Total <span className="font-bold text-ink">₹{rupees(order.total)}</span></p>
          </div>
          {order.status === "REQUESTED" ? (
            <Button variant="ghost" onClick={() => cancel(order.id)}>Cancel</Button>
          ) : null}
        </Card>
      ))}
    </div>
  );
}
