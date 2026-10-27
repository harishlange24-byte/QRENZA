import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getMyGiftCards, recordVisit } from "../../api/giftCard";
import { getErrorMessage } from "../../api/client";
import { Icon } from "../../components/icons";
import { Alert, Button, Card, Empty, PageTitle } from "../../components/ui";

const cardValue = (card) => {
  if (card.type === "FREE_ITEM") return `Free ${card.freeItemName || "item"}`;
  if (card.discountType === "FIXED") return `₹${card.value} off`;
  return `${card.value}% off`;
};

const cardStatus = (card) => {
  if (card.status !== "ACTIVE") return card.status.toLowerCase();
  const days = Math.ceil((new Date(card.expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  return days > 0 ? `valid ${days} more day${days > 1 ? "s" : ""}` : "expiring today";
};

export default function GiftCardsPage() {
  const { code } = useParams();
  const [cards, setCards] = useState([]);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    // Opening the store counts as a visit, which is how the streak grows.
    recordVisit(code)
      .then(({ data }) => setProgress(data.data || null))
      .catch((e) => setError(getErrorMessage(e)));
    getMyGiftCards(code)
      .then(({ data }) => setCards(data.data?.giftCards || []))
      .catch((e) => setError(getErrorMessage(e)));
  }, [code]);

  const until = progress?.untilNextCard;
  const interval = progress?.interval || 7;

  return (
    <div className="space-y-4">
      <PageTitle title="Gift cards" subtitle="Scan on different days and the offers keep growing" />
      <Alert>{error}</Alert>

      {progress ? (
        <Card className="q-fade-up space-y-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-lavender text-purple">
              <Icon name="spark" className="h-5 w-5" />
            </span>
            <p className="text-sm text-muted">
              You have visited on <span className="font-bold text-ink">{progress.totalVisits}</span> day
              {progress.totalVisits === 1 ? "" : "s"}.
            </p>
          </div>

          {progress.giftCard ? (
            <p className="rounded-2xl border border-purple/20 bg-lavender px-4 py-3 text-sm font-semibold text-ink">
              New gift card unlocked · <span className="font-mono tracking-wide">{progress.giftCard.code}</span>
            </p>
          ) : (
            <p className="text-sm text-ink">
              <span className="font-bold text-purple">{until}</span> more visit{until === 1 ? "" : "s"} for a gift card
              {" "}(every {interval} days)
            </p>
          )}
        </Card>
      ) : null}

      {cards.length === 0 && !error ? (
        <Empty title="No gift cards yet" text="Keep scanning this shop on different days to earn offers." />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((card) => (
          <div
            key={card.id}
            className="q-fade-up relative isolate overflow-hidden rounded-4xl bg-[linear-gradient(135deg,#3b0f8f_0%,#6d28d9_55%,#8b5cf6_100%)] p-5 text-white shadow-lift"
          >
            <div className="q-dots pointer-events-none absolute inset-0 opacity-20" />
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-lilac/30 blur-3xl" />

            <div className="relative flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/70">Gift card</p>
                <p className="mt-1 truncate text-lg font-semibold leading-snug">{card.title}</p>
                <p className="mt-0.5 text-sm text-white/80">{cardValue(card)}</p>
              </div>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/25 bg-white/15 text-white backdrop-blur">
                <Icon name="gift" className="h-5 w-5" />
              </span>
            </div>

            <div className="relative mt-5 flex items-center justify-between gap-3 rounded-2xl border border-dashed border-white/40 bg-white/10 px-3.5 py-3 backdrop-blur">
              <span className="truncate font-mono text-sm tracking-wider text-white">{card.code}</span>
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/75">
                {cardStatus(card)}
              </span>
            </div>

            <p className="relative mt-2.5 text-[11px] uppercase tracking-[0.14em] text-white/60">
              {card.source.toLowerCase()}
            </p>
          </div>
        ))}
      </div>

      <Button variant="ghost" className="w-full" onClick={() => window.location.reload()}>
        Check for a new card
      </Button>
    </div>
  );
}
