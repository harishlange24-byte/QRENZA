import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate, useParams } from "react-router-dom";
import { placeOrder } from "../../api/order";
import { getMyGiftCards } from "../../api/giftCard";
import { getErrorMessage } from "../../api/client";
import { orderSchema } from "../../lib/schemas";
import { useCart } from "../../context/CartContext";
import { useVisit } from "../../context/VisitContext";
import { Icon } from "../../components/icons";
import { Alert, Button, Card, Empty, Field, inputClass, PageTitle } from "../../components/ui";

export default function CartPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const cart = useCart();
  const { visit } = useVisit();
  const [error, setError] = useState("");
  const [cards, setCards] = useState([]);
  const [giftCode, setGiftCode] = useState("");
  const form = useForm({
    resolver: zodResolver(orderSchema),
    defaultValues: { tableNumber: visit.tableNumber || "" }
  });

  useEffect(() => {
    const phone = sessionStorage.getItem(`qrenzaOrderPhone_${code}`) || "";
    if (phone) form.setValue("customerPhone", phone);
  }, [code, form]);

  // Logged in customers can tap one of their own cards instead of typing a code.
  useEffect(() => {
    getMyGiftCards(code)
      .then(({ data }) => setCards((data.data?.giftCards || []).filter((c) => c.status === "ACTIVE")))
      .catch(() => setCards([]));
  }, [code]);

  const lines = cart.code === code ? cart.lines : [];
  const subtotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
  const count = lines.reduce((sum, l) => sum + l.quantity, 0);

  async function submit(values) {
    try {
      const { data } = await placeOrder(code, {
        items: lines.map((l) => ({ itemId: l.itemId, quantity: l.quantity })),
        customerName: values.customerName,
        customerPhone: values.customerPhone,
        tableNumber: values.tableNumber || visit.tableNumber || "",
        note: values.note || "",
        giftCardCode: giftCode.trim()
      });
      sessionStorage.setItem(`qrenzaOrderPhone_${code}`, values.customerPhone);
      sessionStorage.setItem(`qrenzaOrderId_${code}`, data.data?.order?.id || "");
      cart.clear();
      navigate(`/s/${code}/orders`);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  if (lines.length === 0) {
    return (
      <div className="space-y-4">
        <PageTitle title="Your cart" subtitle="Add items from the menu" />
        <Empty title="Cart is empty" text="Open the menu and add something you like." />
        <Link to={`/s/${code}/menu`}><Button className="w-full">Open menu</Button></Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-28 lg:pb-0">
      <PageTitle title="Your cart" subtitle="Prices are confirmed by the store" />
      <Alert>{error}</Alert>

      <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
        <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr] lg:items-start">
          <div className="space-y-4">
            {/* Line items: tidy rows with the quantity stepper kept intact. */}
            <div className="space-y-3">
              {lines.map((l) => (
                <Card key={l.itemId} className="flex items-center gap-3 p-3">
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-lavender text-purple">
                    <Icon name="box" className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink">{l.name}</p>
                    <p className="text-xs text-muted">₹{l.price} × {l.quantity}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      aria-label={`Reduce ${l.name}`}
                      className="grid h-11 w-11 place-items-center rounded-2xl border border-line text-lg font-semibold text-ink transition hover:border-lilac active:scale-95"
                      onClick={() => cart.setQty(code, l.itemId, l.quantity - 1)}
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-sm font-semibold text-ink">{l.quantity}</span>
                    <button
                      type="button"
                      aria-label={`Add another ${l.name}`}
                      className="grid h-11 w-11 place-items-center rounded-2xl bg-[linear-gradient(135deg,#3b0f8f,#8b5cf6)] text-lg font-semibold text-white shadow-glow transition active:scale-95"
                      onClick={() => cart.setQty(code, l.itemId, l.quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                </Card>
              ))}
            </div>

            {cards.length ? (
              <Card className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-purple">Your active gift cards</p>
                <div className="space-y-2">
                  {cards.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setGiftCode(c.code)}
                      className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left text-sm transition ${
                        giftCode === c.code ? "border-purple bg-lavender" : "border-line bg-panel hover:border-lilac"
                      }`}
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-purple">
                        <Icon name="gift" className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-ink">{c.title}</span>
                        <span className="block text-xs text-muted">
                          {c.type === "FREE_ITEM"
                            ? `free ${c.freeItemName}`
                            : c.discountType === "FIXED"
                              ? `₹${c.value} off`
                              : `${c.value}% off`}
                        </span>
                      </span>
                      {giftCode === c.code ? (
                        <span className="grid h-6 w-6 place-items-center rounded-full bg-purple text-xs text-white">✓</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </Card>
            ) : null}

            <Card className="space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-purple">Your details</p>
              <Field label="Name" error={form.formState.errors.customerName?.message}>
                <input className={inputClass} {...form.register("customerName")} />
              </Field>
              <Field label="Phone" error={form.formState.errors.customerPhone?.message}>
                <input className={inputClass} maxLength={10} {...form.register("customerPhone")} />
              </Field>
              <Field label="Table (optional)">
                <input className={inputClass} {...form.register("tableNumber")} />
              </Field>
              <Field label="Gift card code (optional)">
                <input
                  className={`${inputClass} font-mono uppercase`}
                  placeholder="GC-XXXXXXXX"
                  value={giftCode}
                  onChange={(e) => setGiftCode(e.target.value.toUpperCase())}
                />
              </Field>
              <Field label="Note for the kitchen (optional)">
                <input className={inputClass} {...form.register("note")} />
              </Field>
            </Card>
          </div>

          {/* Desktop summary: sticks beside the basket on wide screens. */}
          <aside className="hidden lg:sticky lg:top-24 lg:block">
            <Card className="space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-purple">Order summary</p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between text-muted">
                  <span>Items</span>
                  <span className="font-medium text-ink">{count}</span>
                </div>
                <div className="flex items-center justify-between text-muted">
                  <span>Subtotal</span>
                  <span className="font-medium text-ink">₹{subtotal}</span>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-line pt-3">
                <span className="text-sm text-muted">Total</span>
                <span className="text-xl font-bold text-purple">₹{subtotal}</span>
              </div>
              <Button className="w-full">Place order</Button>
            </Card>
          </aside>
        </div>

        {/* Phone summary: sticks above the shell's bottom nav. */}
        <div className="fixed bottom-20 left-0 right-0 z-20 mx-auto max-w-md px-4 lg:hidden">
          <div className="q-glass flex items-center gap-3 rounded-3xl border border-line p-3 shadow-lift">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                {count} item{count === 1 ? "" : "s"}
              </p>
              <p className="text-lg font-bold text-purple">₹{subtotal}</p>
            </div>
            <Button className="ml-auto min-h-[44px] px-6">Place order</Button>
          </div>
        </div>
      </form>
    </div>
  );
}
