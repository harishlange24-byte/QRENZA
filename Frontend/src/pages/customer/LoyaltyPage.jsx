import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getMyLoyalty } from "../../api/loyalty";
import { getErrorMessage } from "../../api/client";
import { Icon } from "../../components/icons";
import { Alert, Badge, Button, Card, Empty, PageTitle } from "../../components/ui";

const ruleText = {
  ONE_PER_VISIT: "one stamp every time you scan here",
  ONE_PER_PURCHASE: "one stamp per purchase, added at the counter"
};

export default function LoyaltyPage() {
  const { code } = useParams();
  const [card, setCard] = useState(null);
  const [program, setProgram] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getMyLoyalty(code)
      .then(({ data }) => {
        setCard(data.data?.card || null);
        setProgram(data.data?.program || null);
      })
      .catch((e) => setError(getErrorMessage(e)));
  }, [code]);

  if (!program) {
    return (
      <div className="space-y-4">
        <PageTitle title="Stamp card" />
        <Alert>{error}</Alert>
        {!error ? <Empty title="No stamp card here yet" text="This shop has not switched stamps on." /> : null}
      </div>
    );
  }

  const stamps = card?.stamps || 0;
  const required = program.stampsRequired || 10;
  const left = Math.max(0, required - stamps);
  const progress = Math.min(100, (stamps / required) * 100);

  return (
    <div className="space-y-4">
      <PageTitle title="Stamp card" subtitle={ruleText[program.stampRule] || program.name} />
      <Alert>{error}</Alert>

      {/* The stamp card itself: a staggered pop on each filled stamp. */}
      <Card halo className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-lilac/20 blur-3xl" />

        <div className="relative flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-purple">Stamp card</p>
            <p className="mt-1 text-sm text-muted">{ruleText[program.stampRule] || program.name}</p>
          </div>
          <Badge tone={left === 0 ? "mint" : "purple"}>
            {stamps}/{required}
          </Badge>
        </div>

        <p className="relative mt-5 text-4xl font-semibold tracking-tight text-ink">
          {stamps}
          <span className="text-lg font-medium text-muted"> / {required} stamps</span>
        </p>

        <div className="relative mt-4 grid grid-cols-5 gap-2.5">
          {Array.from({ length: required }, (_, i) => (
            <span
              key={i}
              className={`q-pop grid aspect-square place-items-center rounded-full text-xs font-bold ${
                i < stamps
                  ? "bg-[linear-gradient(135deg,#3b0f8f,#a78bfa)] text-white shadow-glow"
                  : "border border-line bg-raised text-muted"
              }`}
              style={{ animationDelay: `${i * 55}ms` }}
            >
              {i + 1}
            </span>
          ))}
        </div>

        <div className="relative mt-5 h-2 overflow-hidden rounded-full bg-raised">
          <span
            className="block h-full rounded-full bg-[linear-gradient(90deg,#6d28d9,#a78bfa)] transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="relative mt-3 text-center text-sm text-muted">
          {left === 0 ? "Your card is full — a reward is waiting." : `${left} more stamp${left === 1 ? "" : "s"} and a reward unlocks`}
        </p>
      </Card>

      <Card className="grid grid-cols-2 gap-3 text-center">
        <div className="rounded-3xl bg-raised p-4">
          <p className="text-2xl font-semibold text-purple">{card?.totalStampsEarned || 0}</p>
          <p className="mt-1 text-xs text-muted">stamps earned here</p>
        </div>
        <div className="rounded-3xl bg-raised p-4">
          <p className="text-2xl font-semibold text-purple">{card?.totalRewardsEarned || 0}</p>
          <p className="mt-1 text-xs text-muted">rewards unlocked here</p>
        </div>
      </Card>

      <Link to={`/s/${code}/scratch`} className="block">
        <Button className="w-full">
          <Icon name="spark" className="h-4 w-4" />
          Scratch card
        </Button>
      </Link>
      <Link to={`/s/${code}/rewards`} className="block">
        <Button variant="accent" className="w-full">
          <Icon name="reward" className="h-4 w-4" />
          My rewards
        </Button>
      </Link>
    </div>
  );
}
