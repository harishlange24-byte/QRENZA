import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";
import { createGiftCard, deleteGiftCard, listStoreGiftCards } from "../../api/giftCard";
import { getErrorMessage } from "../../api/client";
import { giftCardSchema } from "../../lib/schemas";
import { Alert, Button, Card, Empty, Field, inputClass, PageTitle } from "../../components/ui";
import { useMerchantStore } from "../../context/MerchantStoreContext";

const cardValue = (card) => {
  if (card.type === "FREE_ITEM") return `Free ${card.freeItemName || "item"}`;
  if (card.discountType === "FIXED") return `₹${card.value} off`;
  return `${card.value}% off`;
};

const emptyCard = { phone: "", title: "", type: "DISCOUNT", discountType: "PERCENTAGE", value: 10, minOrderValue: 0, validityDays: 30 };

export default function GiftCardsAdminPage() {
  const { storeId } = useMerchantStore();
  const [cards, setCards] = useState([]);
  const [error, setError] = useState("");
  const form = useForm({ resolver: zodResolver(giftCardSchema), defaultValues: emptyCard });

  const type = form.watch("type");

  async function load() {
    if (!storeId) return;
    try {
      const { data } = await listStoreGiftCards(storeId);
      setCards(data.data?.giftCards || []);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  useEffect(() => {
    load();
  }, [storeId]);

  async function submit(values) {
    try {
      // A blank phone is fine, this is how a shop wide event offer is made.
      await createGiftCard(storeId, {
        phone: values.phone || "",
        title: values.title,
        type: values.type,
        discountType: values.type === "DISCOUNT" ? values.discountType : null,
        value: values.type === "DISCOUNT" ? values.value : 0,
        freeItemName: values.type === "FREE_ITEM" ? values.freeItemName : "",
        minOrderValue: values.minOrderValue || 0,
        validityDays: values.validityDays || 30
      });
      toast.success("Gift card issued");
      form.reset(emptyCard);
      setError("");
      load();
    } catch (e) {
      setError(getErrorMessage(e));
      toast.error(getErrorMessage(e));
    }
  }

  if (!storeId) {
    return <Empty title="Pick a store" text="Select a store from the sidebar to issue gift cards." />;
  }

  async function remove(card) {
    if (!window.confirm(`Delete the "${card.title}" gift card?`)) return;
    try {
      await deleteGiftCard(storeId, card.id);
      toast.success("Gift card deleted");
      load();
    } catch (e) {
      setError(getErrorMessage(e));
      toast.error(getErrorMessage(e));
    }
  }

  const active = cards.filter((c) => c.status === "ACTIVE");

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <PageTitle title="Gift cards" subtitle="Hand out an offer during an event or a festival" />
        <Alert>{error}</Alert>

        <Card className="mb-4 space-y-2">
          <p className="text-sm font-semibold text-ink">Running with loyalty, free</p>
          <p className="text-sm text-muted">
            Every customer who scans your QR at 7 visits earns a gift card on their phone automatically. You do not
            have to pick anyone or type a phone number for that.
          </p>
        </Card>

        <Card>
          <p className="mb-3 text-sm font-semibold text-ink">Issue a card by hand</p>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={form.handleSubmit(submit)}>
            <Field label="Customer phone (optional)" error={form.formState.errors.phone?.message}>
              <input className={inputClass} maxLength={10} placeholder="Leave blank for everyone" {...form.register("phone")} />
            </Field>
            <Field label="Title" error={form.formState.errors.title?.message}>
              <input className={inputClass} placeholder="Diwali offer" {...form.register("title")} />
            </Field>
            <Field label="Type">
              <select className={inputClass} {...form.register("type")}>
                <option value="DISCOUNT">Discount</option>
                <option value="FREE_ITEM">Free menu item</option>
              </select>
            </Field>
            {type === "DISCOUNT" ? (
              <>
                <Field label="Discount type">
                  <select className={inputClass} {...form.register("discountType")}>
                    <option value="PERCENTAGE">Percentage</option>
                    <option value="FIXED">Fixed rupees</option>
                  </select>
                </Field>
                <Field label="Value">
                  <input className={inputClass} type="number" {...form.register("value")} />
                </Field>
              </>
            ) : (
              <Field label="Free item name" error={form.formState.errors.freeItemName?.message}>
                <input className={inputClass} placeholder="Masala chai" {...form.register("freeItemName")} />
              </Field>
            )}
            <Field label="Minimum order (₹, optional)">
              <input className={inputClass} type="number" {...form.register("minOrderValue")} />
            </Field>
            <Field label="Valid for (days)">
              <input className={inputClass} type="number" {...form.register("validityDays")} />
            </Field>
            <div className="md:col-span-2">
              <Button className="w-full">Issue gift card</Button>
            </div>
          </form>
        </Card>
      </div>

      <div className="space-y-3">
        <PageTitle title="Issued cards" subtitle={`${active.length} active of ${cards.length}`} />
        {!cards.length ? <Empty title="No gift cards" text="Issued and streak cards both appear here." /> : null}
        {cards.map((card) => (
          <Card key={card.id} className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-ink">{card.title}</p>
              <p className="text-sm text-purple">
                {cardValue(card)}
                {card.minOrderValue > 0 ? ` · min ₹${card.minOrderValue}` : ""}
              </p>
              <p className="text-xs text-muted">
                {card.code} · {card.source === "STREAK" ? "auto streak" : "event"}
                {card.customerPhone ? ` · ${card.customerPhone}` : " · everyone"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${card.status === "ACTIVE" ? "bg-lavender text-ink" : "bg-raised text-muted"}`}>
                {card.status.toLowerCase()}
              </span>
              <button className="text-xs text-muted" onClick={() => remove(card)}>Delete</button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
