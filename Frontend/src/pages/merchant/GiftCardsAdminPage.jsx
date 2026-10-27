import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";
import { createGiftCard, deleteGiftCard, listStoreGiftCards } from "../../api/giftCard";
import { getErrorMessage } from "../../api/client";
import { giftCardSchema } from "../../lib/schemas";
import { Alert, Badge, Button, Card, Empty, Field, inputClass, PageTitle } from "../../components/ui";
import { Icon } from "../../components/icons";
import { Reveal } from "../../components/motion";
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
    <div className="space-y-6">
      <Reveal>
        <PageTitle
          eyebrow="Loyalty"
          title="Gift cards"
          subtitle="Hand out an offer during an event or a festival"
        />
      </Reveal>

      <Alert>{error}</Alert>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Reveal>
            <Card halo className="relative overflow-hidden border-0 bg-[linear-gradient(135deg,#2e0b72_0%,#6d28d9_55%,#8b5cf6_100%)] text-white">
              <div className="q-dots pointer-events-none absolute inset-0 opacity-20" />
              <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-white/15 blur-3xl q-float" />
              <div className="relative">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
                  <Icon name="gift" className="h-3.5 w-3.5" />
                  Free with loyalty
                </span>
                <p className="mt-3 text-lg font-semibold">Automatic streak gift cards</p>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-white/80">
                  Every customer who scans your QR at 7 visits earns a gift card on their phone automatically. You do
                  not have to pick anyone or type a phone number for that.
                </p>
              </div>
            </Card>
          </Reveal>

          <Reveal delay={80}>
            <Card>
              <div className="mb-5 flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-lavender text-purple">
                  <Icon name="card" className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">Issue a card by hand</p>
                  <p className="text-xs text-muted">For one guest or a shop wide event.</p>
                </div>
              </div>

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
          </Reveal>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-purple">Issued cards</p>
              <p className="mt-1 text-sm text-muted">
                {active.length} active of {cards.length}
              </p>
            </div>
            <Badge tone="neutral">{cards.length} total</Badge>
          </div>

          {!cards.length ? (
            <Empty title="No gift cards" text="Issued and streak cards both appear here." />
          ) : (
            <div className="grid gap-4">
              {cards.map((card, index) => (
                <Reveal key={card.id} delay={(index % 3) * 70}>
                  <Card
                    hover
                    className="relative overflow-hidden border-0 bg-[linear-gradient(135deg,#2e0b72_0%,#6d28d9_55%,#8b5cf6_100%)] p-0 text-white shadow-lift"
                  >
                    <div className="q-dots pointer-events-none absolute inset-0 opacity-20" />
                    <div className="relative p-5">
                      <div className="flex items-start justify-between gap-3">
                        <p className="min-w-0 text-sm font-semibold">{card.title}</p>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                            card.status === "ACTIVE" ? "bg-white text-purple" : "bg-white/15 text-white/80"
                          }`}
                        >
                          {card.status.toLowerCase()}
                        </span>
                      </div>

                      <p className="mt-3 text-3xl font-black tracking-tight">{cardValue(card)}</p>
                      {card.minOrderValue > 0 ? (
                        <p className="mt-1 text-xs text-white/75">Minimum order ₹{card.minOrderValue}</p>
                      ) : null}

                      <div className="mt-4 flex items-center justify-between gap-3 border-t border-dashed border-white/30 pt-3">
                        <div className="min-w-0">
                          <p className="truncate font-mono text-xs tracking-[0.16em] text-white/90">{card.code}</p>
                          <p className="mt-0.5 truncate text-[11px] text-white/60">
                            {card.source === "STREAK" ? "auto streak" : "event"}
                            {card.customerPhone ? ` · ${card.customerPhone}` : " · everyone"}
                          </p>
                        </div>
                        <button
                          className="shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/20 hover:text-white"
                          onClick={() => remove(card)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </Card>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
