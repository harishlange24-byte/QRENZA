import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getMyLoyalty } from "../../api/loyalty";
import { getErrorMessage } from "../../api/client";
import StampGrid from "../../components/StampGrid";
import { Alert, Button, Card, Empty, PageTitle } from "../../components/ui";

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

  return (
    <div className="space-y-4">
      <PageTitle title="Stamp card" subtitle={ruleText[program.stampRule] || program.name} />
      <Alert>{error}</Alert>

      <Card>
        <StampGrid stamps={stamps} required={required} />
        <p className="mt-3 text-center text-sm">{stamps}/{required} stamps</p>
        <p className="mt-1 text-center text-sm text-muted">
          {left} more stamp{left === 1 ? "" : "s"} and a reward unlocks
        </p>
      </Card>

      <Card className="grid grid-cols-2 gap-3 text-center">
        <div>
          <p className="text-2xl font-semibold text-purple">{card?.totalStampsEarned || 0}</p>
          <p className="text-xs text-muted">stamps earned here</p>
        </div>
        <div>
          <p className="text-2xl font-semibold text-purple">{card?.totalRewardsEarned || 0}</p>
          <p className="text-xs text-muted">rewards unlocked here</p>
        </div>
      </Card>

      <Link to={`/s/${code}/scratch`}><Button className="w-full">Scratch card</Button></Link>
      <Link to={`/s/${code}/rewards`}><Button variant="accent" className="w-full">My rewards</Button></Link>
    </div>
  );
}
