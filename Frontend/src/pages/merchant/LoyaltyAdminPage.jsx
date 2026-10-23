import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { getLoyaltyProgram, upsertLoyaltyProgram } from "../../api/loyalty";
import { getErrorMessage } from "../../api/client";
import { Alert, Button, Card, Empty, Field, inputClass, PageTitle } from "../../components/ui";
import { useMerchantStore } from "../../context/MerchantStoreContext";

export default function LoyaltyAdminPage() {
  const { storeId } = useMerchantStore();
  const [stampsRequired, setStampsRequired] = useState(10);
  const [rewardText, setRewardText] = useState("");
  const [saved, setSaved] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    if (!storeId) return;
    try {
      const { data } = await getLoyaltyProgram(storeId);
      const program = data.data?.program;
      if (program) {
        setSaved(program);
        setStampsRequired(program.stampsRequired ?? 10);
        setRewardText(program.rewardText || "");
      }
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  useEffect(() => {
    load();
  }, [storeId]);

  async function save() {
    setSaving(true);
    try {
      // One stamp lands on every scan, so the customer never has to ask for one.
      await upsertLoyaltyProgram(storeId, {
        stampsRequired: Number(stampsRequired),
        rewardText: rewardText.trim(),
        stampRule: "ONE_PER_VISIT"
      });
      toast.success("Stamp deal saved");
      setError("");
      load();
    } catch (e) {
      setError(getErrorMessage(e));
      toast.error(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  if (!storeId) {
    return <Empty title="Pick a store" text="Select a store from the sidebar to set up stamps." />;
  }

  const needed = Number(saved?.stampsRequired) || Number(stampsRequired) || 10;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <PageTitle title="Loyalty stamps" subtitle="Say how many stamps fill a card, and what the card gives." />
        <Alert>{error}</Alert>
        <Card className="space-y-3">
          <Field label="Stamps needed for the reward">
            <input
              className={inputClass}
              type="number"
              min={1}
              value={stampsRequired}
              onChange={(e) => setStampsRequired(e.target.value)}
            />
          </Field>
          <Field label="What does the customer get?">
            <input
              className={inputClass}
              placeholder="A free masala chai"
              value={rewardText}
              onChange={(e) => setRewardText(e.target.value)}
            />
          </Field>
          <p className="rounded-2xl bg-raised px-3 py-2 text-xs text-muted">
            A stamp is added automatically every time the customer scans your store QR. No phone number needed.
          </p>
          <Button className="w-full" onClick={save} disabled={saving || !rewardText.trim()}>
            {saving ? "Saving…" : "Save stamp deal"}
          </Button>
        </Card>
      </div>

      <div className="space-y-3">
        <PageTitle title="Your stamp deal" />
        {!saved ? (
          <Empty title="No stamp deal yet" text="Fill the form and the deal shows up here." />
        ) : (
          <Card className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-purple">Collect {needed} stamps</p>
              <p className="text-xl font-semibold text-ink">{saved.rewardText || "Reward"}</p>
              <p className="mt-1 text-xs text-muted">
                {saved.stampRule === "ONE_PER_VISIT" ? "One stamp per scan" : "One stamp per purchase"}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: Math.min(needed, 20) }).map((_, i) => (
                <span key={i} className="h-6 w-6 rounded-full border border-line bg-lavender" />
              ))}
              {needed > 20 ? <span className="text-xs text-muted">+{needed - 20} more</span> : null}
            </div>
            <p className="text-sm text-muted">
              When the card fills up, the reward unlocks on the customer's phone with a code they show at the counter.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
