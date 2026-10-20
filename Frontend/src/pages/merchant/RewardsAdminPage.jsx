import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createReward, listRewards, redeemClaim } from "../../api/loyalty";
import { getErrorMessage } from "../../api/client";
import { rewardSchema } from "../../lib/schemas";
import { Alert, Button, Card, Field, inputClass, PageTitle } from "../../components/ui";
import { useMerchantStore } from "../../context/MerchantStoreContext";

export default function RewardsAdminPage() {
  const { storeId } = useMerchantStore();
  const [rewards, setRewards] = useState([]);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const form = useForm({ resolver: zodResolver(rewardSchema), defaultValues: { type: "DISCOUNT", discountType: "PERCENTAGE", probability: 15, validityDays: 30 } });

  async function load() {
    try {
      const { data } = await listRewards(storeId);
      setRewards(data.rewards || []);
    } catch (e) { setError(getErrorMessage(e)); }
  }

  return (
    <div className="space-y-4">
      <PageTitle title="Scratch rewards" subtitle="Probability lives on the server." />
      <Alert>{error}</Alert>
      <Card>
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={form.handleSubmit(async (v) => {
          try { await createReward(storeId, v); load(); } catch (e) { setError(getErrorMessage(e)); }
        })}>
          <Field label="Name"><input className={inputClass} {...form.register("name")} /></Field>
          <Field label="Type">
            <select className={inputClass} {...form.register("type")}>
              {["DISCOUNT", "FREE_ITEM", "COUPON", "CUSTOM"].map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Value"><input className={inputClass} type="number" {...form.register("value")} /></Field>
          <Field label="Win %"><input className={inputClass} type="number" {...form.register("probability")} /></Field>
          <Button className="sm:col-span-2">Save reward</Button>
        </form>
      </Card>
      <Card className="flex gap-2">
        <input className={inputClass} placeholder="Claim code to redeem" value={code} onChange={(e) => setCode(e.target.value)} />
        <Button onClick={() => redeemClaim(storeId, code).catch((e) => setError(getErrorMessage(e)))}>Redeem</Button>
      </Card>
      {rewards.map((r) => (
        <Card key={r._id}><p className="font-semibold">{r.name}</p><p className="text-xs">{r.probability}% · {r.type}</p></Card>
      ))}
    </div>
  );
}
