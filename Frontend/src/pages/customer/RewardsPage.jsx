import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getMyRewards } from "../../api/loyalty";
import { getErrorMessage } from "../../api/client";
import { Icon } from "../../components/icons";
import { Alert, Badge, Card, Empty, PageTitle } from "../../components/ui";

// Reward claim status to a badge tone, so colour reads at a glance.
const STATUS_BADGE = {
  ACTIVE: "mint",
  ISSUED: "purple",
  USED: "neutral",
  REDEEMED: "neutral",
  EXPIRED: "rose",
  CANCELLED: "rose"
};

export default function RewardsPage() {
  const { code } = useParams();
  const [claims, setClaims] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    getMyRewards(code)
      .then(({ data }) => setClaims(data.data?.claims || []))
      .catch((e) => setError(getErrorMessage(e)));
  }, [code]);

  return (
    <div className="space-y-4">
      <PageTitle title="Rewards" subtitle="Show the code at the counter to claim" />
      <Alert>{error}</Alert>
      {!claims.length && !error ? (
        <Empty title="No rewards yet" text="Fill the stamp card or scratch after a visit." />
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {claims.map((c) => (
          <Card key={c._id || c.code} hover className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-lavender text-purple">
                <Icon name="reward" className="h-5 w-5" />
              </span>
              <Badge tone={STATUS_BADGE[String(c.status).toUpperCase()] || "purple"}>{c.status}</Badge>
            </div>

            <div>
              <p className="font-semibold text-ink">{c.reward?.name || c.name || "Reward"}</p>
              <p className="mt-0.5 text-xs text-muted">
                Expires {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : "-"}
              </p>
            </div>

            <div className="mt-auto flex items-center justify-between gap-2 rounded-2xl border border-dashed border-line bg-raised px-3.5 py-2.5">
              <span className="truncate font-mono text-sm tracking-wider text-ink">{c.code}</span>
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                Show at counter
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
