import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { cancelSupplyOrder, createSupplyOrder, listSupplyCatalog, listSupplyOrders } from "../../api/supply";
import { getErrorMessage } from "../../api/client";
import { supplyOrderSchema } from "../../lib/schemas";
import { FEATURE_LABELS } from "../../lib/features";
import { Alert, Badge, Button, Card, Empty, Field, inputClass, PageTitle } from "../../components/ui";
import { Icon } from "../../components/icons";
import { Reveal } from "../../components/motion";
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

  const featureCodes = access?.features || [];
  const included = featureCodes.map((f) => FEATURE_LABELS[f] || f);
  const locked = Object.keys(FEATURE_LABELS).filter((code) => !featureCodes.includes(code));

  return (
    <div className="space-y-6">
      <Reveal>
        <PageTitle
          eyebrow="Shop kit"
          title="Supplies"
          subtitle="Printed QR standees, table tents and stickers"
        />
      </Reveal>

      <Alert>{error}</Alert>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Reveal>
            <Card className="overflow-hidden p-0">
              <div className="relative overflow-hidden bg-[linear-gradient(135deg,#2e0b72_0%,#6d28d9_55%,#8b5cf6_100%)] px-5 py-5 text-white">
                <div className="q-dots pointer-events-none absolute inset-0 opacity-20" />
                <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/15 blur-3xl q-float" />
                <div className="relative">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/70">Your plan</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {access?.plan?.displayName || access?.planCode || "No plan selected"}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-white/80">
                    Standees and stickers are billed once, delivery is a flat ₹{rupees(shipping || 4900)} per order.
                  </p>
                </div>
              </div>

              <div className="space-y-4 p-5">
                {included.length ? (
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-purple">Unlocked</p>
                    <div className="flex flex-wrap gap-1.5">
                      {included.map((label) => (
                        <Badge key={label} tone="mint">✓ {label}</Badge>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted">Start a plan to unlock more of Qrenza.</p>
                )}

                {locked.length ? (
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Locked</p>
                    <div className="flex flex-wrap gap-1.5">
                      {locked.map((code) => (
                        <Badge key={code} tone="outline">{FEATURE_LABELS[code] || code}</Badge>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </Card>
          </Reveal>

          <Reveal delay={80}>
            <div className="grid gap-3">
              {products.map((product) => (
                <Card key={product.id} hover className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-lavender text-purple">
                      <Icon name="box" className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">{product.name}</p>
                      <p className="truncate text-sm text-muted">{product.description}</p>
                      <p className="mt-1 text-sm font-bold text-purple">₹{rupees(product.price)}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      aria-label={`Remove one ${product.name}`}
                      className="grid h-8 w-8 place-items-center rounded-xl border border-line text-ink transition hover:border-lilac hover:bg-raised"
                      onClick={() => setQty(product, qtyOf(product.id) - 1)}
                    >
                      −
                    </button>
                    <span className="w-5 text-center text-sm font-semibold text-ink">{qtyOf(product.id)}</span>
                    <button
                      aria-label={`Add one ${product.name}`}
                      className="grid h-8 w-8 place-items-center rounded-xl border border-line text-ink transition hover:border-lilac hover:bg-raised"
                      onClick={() => setQty(product, qtyOf(product.id) + 1)}
                    >
                      +
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          </Reveal>

          <Reveal delay={120}>
            <Card>
              <div className="mb-4 flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-lavender text-purple">
                  <Icon name="cart" className="h-5 w-5" />
                </span>
                <p className="text-sm font-semibold text-ink">Delivery details</p>
              </div>

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

                <div className="space-y-1.5 rounded-2xl bg-raised p-4 text-sm">
                  <div className="flex justify-between text-muted">
                    <span>Items</span>
                    <span>₹{rupees(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-muted">
                    <span>Delivery</span>
                    <span>₹{rupees(cart.length ? shipping : 0)}</span>
                  </div>
                  <div className="mt-1 flex justify-between border-t border-line pt-2 font-bold text-ink">
                    <span>Total</span>
                    <span className="text-purple">₹{rupees(total)}</span>
                  </div>
                </div>

                <Button className="w-full">Place supply order</Button>
              </form>
            </Card>
          </Reveal>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-purple">Past supply orders</p>
              <p className="mt-1 text-sm text-muted">
                {orders.length} order{orders.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          {!orders.length ? (
            <Empty title="No supply orders" text="Order a standee and it will show up here." />
          ) : (
            <div className="grid gap-3">
              {orders.map((order) => (
                <Card key={order.id} hover className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">
                        {order.items.reduce((n, l) => n + l.quantity, 0)} item
                        {order.items.reduce((n, l) => n + l.quantity, 0) === 1 ? "" : "s"}
                      </p>
                      <p className="truncate text-xs text-muted">
                        {new Date(order.createdAt).toLocaleDateString()} · {order.contactName} · {order.contactPhone}
                      </p>
                    </div>
                    <Badge tone={order.status === "REQUESTED" ? "purple" : "neutral"}>
                      {order.status.toLowerCase()}
                    </Badge>
                  </div>

                  <div className="space-y-1 border-t border-line pt-3 text-sm">
                    {order.items.map((l, i) => (
                      <div key={i} className="flex justify-between gap-3 text-muted">
                        <span className="truncate">{l.name} × {l.quantity}</span>
                        <span className="shrink-0 text-ink">₹{rupees(l.price * l.quantity)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                    <p className="text-sm text-muted">
                      Delivery ₹{rupees(order.shipping)} · Total <span className="font-bold text-ink">₹{rupees(order.total)}</span>
                    </p>
                    {order.status === "REQUESTED" ? (
                      <Button variant="ghost" size="sm" onClick={() => cancel(order.id)}>Cancel</Button>
                    ) : null}
                  </div>

                  {order.deliveryAddress ? <p className="truncate text-xs text-muted">To: {order.deliveryAddress}</p> : null}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
