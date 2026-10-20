import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getMyLoyalty } from "../../api/loyalty";
import { getErrorMessage } from "../../api/client";
import StampGrid from "../../components/StampGrid";
import { Alert, Button, Card, PageTitle } from "../../components/ui";

export default function LoyaltyPage() {
  const { code } = useParams();
  const [card, setCard] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getMyLoyalty(code)
      .then(({ data }) => setCard(data.card || data))
      .catch((e) => setError(getErrorMessage(e)));
  }, [code]);

  const stamps = card?.stamps || 0;
  const required = card?.program?.stampsRequired || 10;

  return (
    <div className="space-y-4">
      <PageTitle title="Stamp card" subtitle="Ask staff to add a stamp after purchase" />
      <Alert>{error}</Alert>
      <Card>
        <StampGrid stamps={stamps} required={required} />
        <p className="mt-3 text-center text-sm">{stamps}/{required} stamps</p>
      </Card>
      <Link to={`/s/${code}/scratch`}><Button className="w-full">Scratch card</Button></Link>
      <Link to={`/s/${code}/rewards`}><Button variant="accent" className="w-full">My rewards</Button></Link>
    </div>
  );
}
