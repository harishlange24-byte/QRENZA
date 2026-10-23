import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";
import { createReward, deleteReward, listRewards, redeemClaim } from "../../api/loyalty";
import { getErrorMessage } from "../../api/client";
import { rewardSchema } from "../../lib/schemas";
import { Alert, Button, Card, Empty, Field, inputClass, PageTitle } from "../../components/ui";
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
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <PageTitle title="Rewards" subtitle="Prizes a customer can win on the scratch card" />
        <Alert>{error}</Alert>

        <Card>
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

        <Card className="mt-4 space-y-3">
          <div>
            <p className="text-sm font-semibold text-ink">Redeem a customer's reward</p>
            <p className="text-xs text-muted">
              The customer shows the code from their phone, type it here to mark the reward as used.
            </p>
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
      </div>

      <div className="space-y-3">
        <PageTitle
          title="Your rewards"
          subtitle={`${scratchable.length} on the scratch card of ${rewards.length} total`}
        />
        {!rewards.length ? <Empty title="No rewards yet" text="Create one on the left and it shows up here." /> : null}
        {rewards.map((r) => (
          <Card key={r._id} className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-ink">{r.name}</p>
                <p className="text-sm text-purple">{rewardLabel(r)}</p>
              </div>
              <span
                className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${
                  r.probability > 0 ? "bg-lavender text-ink" : "bg-raised text-muted"
                }`}
              >
                {r.probability > 0 ? "scratch card" : "loyalty milestone"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted">
                {r.claimedCount || 0} claimed
                {r.maxClaims ? ` of ${r.maxClaims}` : " · unlimited"}
                {r.validityDays ? ` · valid ${r.validityDays} days` : ""}
              </p>
              <button className="text-xs text-muted" onClick={() => remove(r)}>Delete</button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
