import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { getLoyaltyProgram, upsertLoyaltyProgram } from "../../api/loyalty";
import { getErrorMessage } from "../../api/client";
import { Alert, Badge, Button, Card, Empty, Field, inputClass, PageTitle } from "../../components/ui";
import { Icon } from "../../components/icons";
import { Reveal } from "../../components/motion";
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
    <div className="space-y-6">
      <Reveal>
        <PageTitle
          eyebrow="Loyalty"
          title="Loyalty stamps"
          subtitle="Say how many stamps fill a card, and what the card gives."
        />
      </Reveal>

      <Alert>{error}</Alert>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <Reveal>
          <Card className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-lavender text-purple">
                <Icon name="stamp" className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-purple">Stamp rule</p>
                <p className="text-sm text-muted">How the card fills and what unlocks.</p>
              </div>
            </div>

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
            <p className="flex items-start gap-2 rounded-2xl border border-line bg-raised px-3.5 py-3 text-xs text-muted">
              <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-lavender text-[9px] text-purple">✦</span>
              A stamp is added automatically every time the customer scans your store QR. No phone number needed.
            </p>
            <Button className="w-full" onClick={save} disabled={saving || !rewardText.trim()}>
              {saving ? "Saving…" : "Save stamp deal"}
            </Button>
          </Card>
        </Reveal>

        <div className="space-y-4">
          {!saved ? (
            <Empty title="No stamp deal yet" text="Fill the form and the deal shows up here." />
          ) : (
            <Reveal delay={80}>
              <Card halo className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-purple">Collect {needed} stamps</p>
                    <p className="mt-1 text-2xl font-semibold tracking-tight text-ink">{saved.rewardText || "Reward"}</p>
                    <p className="mt-1 text-xs text-muted">
                      {saved.stampRule === "ONE_PER_VISIT" ? "One stamp per scan" : "One stamp per purchase"}
                    </p>
                  </div>
                  <Badge tone="purple">{needed} to go</Badge>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {Array.from({ length: Math.min(needed, 20) }).map((_, i) => (
                    <span key={i} className="h-7 w-7 rounded-full border border-line bg-lavender" />
                  ))}
                  {needed > 20 ? <span className="self-center text-xs text-muted">+{needed - 20} more</span> : null}
                </div>

                <p className="text-sm text-muted">
                  When the card fills up, the reward unlocks on the customer's phone with a code they show at the counter.
                </p>
              </Card>
            </Reveal>
          )}
        </div>
      </div>
    </div>
  );
}
