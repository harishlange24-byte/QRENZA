import { useState } from "react";
import { useParams } from "react-router-dom";
import { scratchReward } from "../../api/loyalty";
import { getErrorMessage } from "../../api/client";
import { getCurrentPosition } from "../../lib/geo";
import { useVisit } from "../../context/VisitContext";
import ScratchCard from "../../components/ScratchCard";
import { Icon } from "../../components/icons";
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
      setResult(data.data?.reward || null);
      setRevealed(true);
      setError("");
    } catch (e) {
      setError(getErrorMessage(e));
      setRevealed(true);
    }
  }

  return (
    <div className="space-y-4">
      <PageTitle eyebrow="Play to win" title="Scratch & win" subtitle="Winner is picked on the server, not in this phone." />
      <Alert>{error}</Alert>

      {/* Scratch surface inside a gradient frame, with the reveal card below. */}
      <section className="relative isolate overflow-hidden rounded-4xl bg-[linear-gradient(135deg,#1a0b3d_0%,#3b0f8f_45%,#6d28d9_100%)] p-5 shadow-lift">
        <div className="q-dots pointer-events-none absolute inset-0 opacity-20" />
        <div className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full bg-lilac/35 blur-3xl q-float" />
        <div className="pointer-events-none absolute -bottom-16 -left-10 h-44 w-44 rounded-full bg-glow/25 blur-3xl q-float-slow" />

        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/85">
              <Icon name="spark" className="h-3.5 w-3.5" />
              Instant win
            </span>
            <Icon name="spark" className="h-5 w-5 text-white/50 q-pulse" />
          </div>

          <div className="mt-4 rounded-3xl border border-white/20 bg-white/10 p-2 backdrop-blur">
            <ScratchCard
              revealed={revealed}
              onReveal={onReveal}
              label={result?.name || (revealed ? "Better luck next visit" : "Prize waiting")}
            />
          </div>

          {revealed ? (
            <div className="q-pop mt-4 rounded-3xl bg-white/95 p-4 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-purple">
                {result ? "You won" : "Result"}
              </p>
              <p className="mt-1 text-xl font-semibold text-ink q-pop">{result?.name || "Better luck next visit"}</p>
              {result?.code ? (
                <p className="mt-2 inline-flex items-center rounded-2xl border border-dashed border-line bg-raised px-3.5 py-1.5 font-mono text-sm tracking-wider text-ink">
                  {result.code}
                </p>
              ) : null}
              {result?.code ? <p className="mt-2 text-xs text-muted">Show this code at the counter</p> : null}
            </div>
          ) : null}
        </div>
      </section>

      <Card className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-lavender text-purple">
          <Icon name="shield" className="h-5 w-5" />
        </span>
        <p className="text-sm text-muted">
          Scratch the purple layer. You have to be inside the shop for the prize to unlock.
        </p>
      </Card>
    </div>
  );
}
