import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getMyRewards } from "../../api/loyalty";
import { getErrorMessage } from "../../api/client";
import { Alert, Card, Empty, PageTitle } from "../../components/ui";

export default function RewardsPage() {
  const { code } = useParams();
  const [claims, setClaims] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    getMyRewards(code)
      .then(({ data }) => setClaims(data.claims || data.rewards || []))
      .catch((e) => setError(getErrorMessage(e)));
  }, [code]);

  return (
    <div className="space-y-4">
      <PageTitle title="Rewards" />
      <Alert>{error}</Alert>
      {!claims.length && !error ? <Empty title="No rewards yet" text="Fill the stamp card or scratch after a visit." /> : null}
      {claims.map((c) => (
        <Card key={c._id || c.code}>
          <p className="font-semibold">{c.reward?.name || c.name || "Reward"}</p>
          <p className="text-sm">Code: {c.code}</p>
          <p className="text-xs text-muted">{c.status} · expires {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : "-"}</p>
        </Card>
      ))}
    </div>
  );
}
