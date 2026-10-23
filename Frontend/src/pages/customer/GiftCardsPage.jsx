import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getMyGiftCards, recordVisit } from "../../api/giftCard";
import { getErrorMessage } from "../../api/client";
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
        <Card className="space-y-2">
          <p className="text-sm text-muted">
            You have visited on <span className="font-bold text-ink">{progress.totalVisits}</span> day
            {progress.totalVisits === 1 ? "" : "s"}.
          </p>
          {progress.giftCard ? (
            <p className="rounded-2xl bg-lavender px-3 py-2 text-sm font-semibold text-ink">
              New gift card unlocked · {progress.giftCard.code}
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

      {cards.map((card) => (
        <Card key={card.id} className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-ink">{card.title}</p>
            <p className="text-sm text-purple">{cardValue(card)}</p>
            <p className="text-xs text-muted">{cardStatus(card)} · {card.source.toLowerCase()}</p>
          </div>
          <span className="rounded-2xl bg-raised px-3 py-2 text-xs font-semibold text-ink">{card.code}</span>
        </Card>
      ))}

      <Button variant="ghost" className="w-full" onClick={() => window.location.reload()}>
        Check for a new card
      </Button>
    </div>
  );
}
