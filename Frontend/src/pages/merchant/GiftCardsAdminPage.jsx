import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createGiftCard, listStoreGiftCards } from "../../api/giftCard";
import { getErrorMessage } from "../../api/client";
import { giftCardSchema } from "../../lib/schemas";
import { Alert, Button, Card, Empty, Field, inputClass, PageTitle } from "../../components/ui";
import { useMerchantStore } from "../../context/MerchantStoreContext";

const cardValue = (card) => {
  if (card.type === "FREE_ITEM") return `Free ${card.freeItemName || "item"}`;
  if (card.discountType === "FIXED") return `₹${card.value} off`;
  return `${card.value}% off`;
};

export default function GiftCardsAdminPage() {
  const { storeId } = useMerchantStore();
  const [cards, setCards] = useState([]);
  const [error, setError] = useState("");
  const form = useForm({
    resolver: zodResolver(giftCardSchema),
    defaultValues: { type: "DISCOUNT", discountType: "PERCENTAGE", value: 10, validityDays: 30, minOrderValue: 0 }
  });

  const type = form.watch("type");

  async function load() {
    if (!storeId) return;
    try {
      const { data } = await listStoreGiftCards(storeId);
      setCards(data.giftCards || []);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  useEffect(() => {
    load();
  }, [storeId]);

  async function submit(values) {
    try {
      // The backend reads `phone`, the form field is named the same on purpose.
      await createGiftCard(storeId, {
        phone: values.phone,
        title: values.title,
        type: values.type,
        discountType: values.type === "DISCOUNT" ? values.discountType : null,
        value: values.type === "DISCOUNT" ? values.value : 0,
        freeItemName: values.type === "FREE_ITEM" ? values.freeItemName : "",
        minOrderValue: values.minOrderValue || 0,
        validityDays: values.validityDays || 30
      });
      form.reset({
        type: "DISCOUNT",
        discountType: "PERCENTAGE",
        value: 10,
        validityDays: 30,
        minOrderValue: 0
      });
      setError("");
      load();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  if (!storeId) {
    return <Empty title="Pick a store" text="Select a store from the sidebar to issue gift cards." />;
  }

  return (
    <div className="space-y-4">
      <PageTitle title="Gift cards" subtitle="Hand out offers during events or keep the scan streak running" />
      <Alert>{error}</Alert>

      <Card>
        <p className="mb-3 text-sm font-semibold text-ink">Issue a gift card</p>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={form.handleSubmit(submit)}>
          <Field label="Customer phone" error={form.formState.errors.phone?.message}>
            <input className={inputClass} maxLength={10} {...form.register("phone")} />
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

      <PageTitle title="Issued cards" />
      {cards.length === 0 ? <Empty title="No gift cards" text="Issued and streak cards both appear here." /> : null}
      {cards.map((card) => (
        <Card key={card.id} className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-ink">{card.title}</p>
            <p className="text-sm text-purple">
              {cardValue(card)}
              {card.minOrderValue > 0 ? ` · min ₹${card.minOrderValue}` : ""}
            </p>
            <p className="text-xs text-muted">
              {card.code} · {card.source.toLowerCase()} · {card.status.toLowerCase()}
            </p>
          </div>
          <span className="text-xs text-muted">
            {card.usedAt ? "used" : new Date(card.expiresAt).toLocaleDateString()}
          </span>
        </Card>
      ))}
    </div>
  );
}
