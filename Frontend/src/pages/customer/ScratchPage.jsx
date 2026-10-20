import { useState } from "react";
import { useParams } from "react-router-dom";
import { scratchReward } from "../../api/loyalty";
import { getErrorMessage } from "../../api/client";
import { getCurrentPosition } from "../../lib/geo";
import { useVisit } from "../../context/VisitContext";
import ScratchCard from "../../components/ScratchCard";
import { Alert, Card, PageTitle } from "../../components/ui";

export default function ScratchPage() {
  const { code } = useParams();
  const { visit, setVisit } = useVisit();
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [revealed, setRevealed] = useState(false);

  async function onReveal() {
    try {
      // The server only releases a prize inside the store geofence, so the
      // coordinates are collected here when the customer has not shared them yet.
      let coords = visit.coords;

      if (!coords) {
        coords = await getCurrentPosition();
        setVisit((v) => ({ ...v, coords, gpsAllowed: true }));
      }

      const { data } = await scratchReward(code, coords);
      setResult(data.reward || data);
      setRevealed(true);
      setError("");
    } catch (e) {
      setError(getErrorMessage(e));
      setRevealed(true);
    }
  }

  return (
    <div className="space-y-4">
      <PageTitle title="Scratch & win" subtitle="Winner is picked on the server, not in this phone." />
      <Alert>{error}</Alert>
      <ScratchCard
        revealed={revealed}
        onReveal={onReveal}
        label={result?.name || (revealed ? "Better luck next visit" : "Prize waiting")}
      />
      <Card>
        <p className="text-sm text-muted">Scratch the purple layer. You have to be inside the shop for the prize to unlock.</p>
      </Card>
    </div>
  );
}
