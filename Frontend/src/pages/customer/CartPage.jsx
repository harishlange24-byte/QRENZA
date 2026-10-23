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
    <div className="space-y-4">
      <PageTitle title="Your cart" subtitle="Prices are confirmed by the store" />
      <Alert>{error}</Alert>
      {lines.map((l) => (
        <Card key={l.itemId} className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-ink">{l.name}</p>
            <p className="text-sm text-muted">₹{l.price} × {l.quantity}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="h-8 w-8 rounded-xl border border-line text-ink"
              onClick={() => cart.setQty(code, l.itemId, l.quantity - 1)}
            >
              −
            </button>
            <span className="w-4 text-center text-sm font-semibold text-ink">{l.quantity}</span>
            <button
              className="h-8 w-8 rounded-xl border border-line text-ink"
              onClick={() => cart.setQty(code, l.itemId, l.quantity + 1)}
            >
              +
            </button>
          </div>
        </Card>
      ))}

      <Card className="flex items-center justify-between">
        <p className="text-sm text-muted">Subtotal</p>
        <p className="text-lg font-bold text-purple">₹{subtotal}</p>
      </Card>

      {cards.length ? (
        <Card className="space-y-2">
          <p className="text-xs font-medium tracking-wide text-purple">Your active gift cards</p>
          {cards.map((c) => (
            <button
              key={c.id}
              onClick={() => setGiftCode(c.code)}
              className={`block w-full rounded-2xl border px-3 py-2 text-left text-sm ${
                giftCode === c.code ? "border-purple bg-raised" : "border-line"
              }`}
            >
              <span className="font-semibold text-ink">{c.title}</span>
              <span className="ml-2 text-xs text-muted">
                {c.type === "FREE_ITEM"
                  ? `free ${c.freeItemName}`
                  : c.discountType === "FIXED"
                    ? `₹${c.value} off`
                    : `${c.value}% off`}
              </span>
            </button>
          ))}
        </Card>
      ) : null}

      <form className="space-y-3" onSubmit={form.handleSubmit(submit)}>
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
            className={inputClass}
            placeholder="GC-XXXXXXXX"
            value={giftCode}
            onChange={(e) => setGiftCode(e.target.value.toUpperCase())}
          />
        </Field>
        <Field label="Note for the kitchen (optional)">
          <input className={inputClass} {...form.register("note")} />
        </Field>
        <Button className="w-full">Place order</Button>
      </form>
    </div>
  );
}
