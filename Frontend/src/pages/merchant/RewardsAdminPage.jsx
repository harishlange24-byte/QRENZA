import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";
import { createReward, deleteReward, listRewards, redeemClaim } from "../../api/loyalty";
import { getErrorMessage } from "../../api/client";
import { rewardSchema } from "../../lib/schemas";
import { Alert, Badge, Button, Card, Empty, Field, inputClass, PageTitle } from "../../components/ui";
import { Icon } from "../../components/icons";
import { Reveal } from "../../components/motion";
import { useMerchantStore } from "../../context/MerchantStoreContext";

// A reward is stored as a kind plus a value, the label just reads it back.
const rewardLabel = (reward) => {
  if (reward.type === "FREE_ITEM") return "Free item";
  if (reward.type === "COUPON") return "Coupon";
  if (reward.type === "CUSTOM") return "Counter reward";
  if (reward.discountType === "FIXED") return `₹${reward.value} off`;
  return `${reward.value}% off`;
};

const emptyReward = { type: "DISCOUNT", discountType: "PERCENTAGE", value: 10, quantity: "", validityDays: 30 };

export default function RewardsAdminPage() {
  const { storeId } = useMerchantStore();
  const [rewards, setRewards] = useState([]);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const form = useForm({ resolver: zodResolver(rewardSchema), defaultValues: emptyReward });

  const type = form.watch("type");

  async function load() {
    if (!storeId) return;
    try {
      const { data } = await listRewards(storeId);
      setRewards(data.data?.rewards || []);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  useEffect(() => {
    load();
  }, [storeId]);

  async function submit(values) {
    try {
      await createReward(storeId, {
        name: values.name,
        type: values.type,
        discountType: values.type === "DISCOUNT" ? values.discountType : null,
        value: values.type === "DISCOUNT" ? values.value : 0,
        // Every scratch card wins one of these, so it always has a chance.
        probability: 100,
        maxClaims: values.quantity === "" || values.quantity === undefined ? null : values.quantity,
        validityDays: values.validityDays || 30
      });
      toast.success(`Reward "${values.name}" created`);
      form.reset(emptyReward);
      setError("");
      load();
    } catch (e) {
      setError(getErrorMessage(e));
      toast.error(getErrorMessage(e));
    }
  }

  async function redeem() {
    try {
      await redeemClaim(storeId, code.trim());
      toast.success("Reward redeemed");
      setCode("");
      setError("");
    } catch (e) {
      setError(getErrorMessage(e));
      toast.error(getErrorMessage(e));
    }
  }

  // Already claimed codes stay in the customer's history, only the prize is retired.
  async function remove(reward) {
    if (!window.confirm(`Delete the "${reward.name}" reward? Customers stop winning it.`)) return;
    try {
      await deleteReward(storeId, reward._id);
      toast.success("Reward deleted");
      load();
    } catch (e) {
      setError(getErrorMessage(e));
      toast.error(getErrorMessage(e));
    }
  }

  if (!storeId) {
    return <Empty title="Pick a store" text="Select a store from the sidebar to build rewards." />;
  }

  const scratchable = rewards.filter((r) => r.probability > 0);

  return (
    <div className="space-y-6">
      <Reveal>
        <PageTitle
          eyebrow="Loyalty"
          title="Rewards"
          subtitle="Prizes a customer can win on the scratch card"
        />
      </Reveal>

      <Alert>{error}</Alert>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Reveal>
            <Card>
              <div className="mb-5 flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-lavender text-purple">
                  <Icon name="spark" className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">Create a reward</p>
                  <p className="text-xs text-muted">Every scratch card wins one of these.</p>
                </div>
              </div>

              <form className="space-y-3" onSubmit={form.handleSubmit(submit)}>
                <Field label="Reward name" error={form.formState.errors.name?.message}>
                  <input className={inputClass} placeholder="Free masala chai" {...form.register("name")} />
                </Field>

                <Field label="What kind of reward?">
                  <select className={inputClass} {...form.register("type")}>
                    <option value="DISCOUNT">Discount on the bill</option>
                    <option value="FREE_ITEM">A free menu item</option>
                    <option value="COUPON">A coupon code</option>
                    <option value="CUSTOM">Something at the counter</option>
                  </select>
                </Field>

                {type === "DISCOUNT" ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Discount is">
                      <select className={inputClass} {...form.register("discountType")}>
                        <option value="PERCENTAGE">Percent %</option>
                        <option value="FIXED">Rupees ₹</option>
                      </select>
                    </Field>
                    <Field label="How much?" error={form.formState.errors.value?.message}>
                      <input className={inputClass} type="number" {...form.register("value")} />
                    </Field>
                  </div>
                ) : null}

                <div className="grid grid-cols-2 gap-2">
                  <Field label="How many to give (blank = unlimited)">
                    <input className={inputClass} type="number" placeholder="Unlimited" {...form.register("quantity")} />
                  </Field>
                  <Field label="Valid for (days)">
                    <input className={inputClass} type="number" {...form.register("validityDays")} />
                  </Field>
                </div>

                <Button className="w-full">Create reward</Button>
              </form>
            </Card>
          </Reveal>

          <Reveal delay={80}>
            <Card className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-lavender text-purple">
                  <Icon name="gift" className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">Redeem a customer's reward</p>
                  <p className="text-xs text-muted">
                    The customer shows the code from their phone, type it here to mark the reward as used.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  className={inputClass}
                  placeholder="Reward code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
                <Button variant="accent" onClick={redeem} disabled={!code.trim()}>Redeem</Button>
              </div>
            </Card>
          </Reveal>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-purple">Your rewards</p>
              <p className="mt-1 text-sm text-muted">
                {scratchable.length} on the scratch card of {rewards.length} total
              </p>
            </div>
            <Badge tone="neutral">{rewards.length} total</Badge>
          </div>

          {!rewards.length ? (
            <Empty title="No rewards yet" text="Create one on the left and it shows up here." />
          ) : (
            <div className="grid gap-4">
              {rewards.map((r, index) => (
                <Reveal key={r._id} delay={(index % 3) * 70}>
                  <Card hover className="overflow-hidden p-0">
                    <div className="relative overflow-hidden bg-[linear-gradient(120deg,#f5f3ff_0%,#ffffff_50%,#ede9fe_100%)] p-5">
                      <div className="q-dots pointer-events-none absolute inset-0 opacity-40" />
                      <div className="relative flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-ink">{r.name}</p>
                          <p className="mt-0.5 text-sm font-semibold text-purple">{rewardLabel(r)}</p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                            r.probability > 0 ? "bg-lavender text-purple" : "bg-raised text-muted"
                          }`}
                        >
                          {r.probability > 0 ? "scratch card" : "loyalty milestone"}
                        </span>
                      </div>

                      <div className="relative mt-4 flex items-center gap-3 rounded-2xl border border-dashed border-lilac bg-white/70 px-3 py-2">
                        <Icon name="spark" className="h-4 w-4 shrink-0 text-purple" />
                        <span className="truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                          Scratch foil
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 border-t border-dashed border-line bg-panel px-5 py-3">
                      <p className="text-xs text-muted">
                        {r.claimedCount || 0} claimed
                        {r.maxClaims ? ` of ${r.maxClaims}` : " · unlimited"}
                        {r.validityDays ? ` · valid ${r.validityDays} days` : ""}
                      </p>
                      <button
                        className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold text-muted transition hover:bg-rose/10 hover:text-rose"
                        onClick={() => remove(r)}
                      >
                        Delete
                      </button>
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
