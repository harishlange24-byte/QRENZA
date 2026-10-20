import { Link } from "react-router-dom";
import { useAccess } from "../context/AccessContext";
import { Button, Card, PageTitle } from "./ui";

// Mirrors the server side requireFeature guard. The API is the real gate, this
// only stops the merchant from landing on a screen that would fail anyway.
export default function FeatureGate({ feature, title, children }) {
  const { access, ready } = useAccess();

  if (!ready) return <p className="text-sm text-muted">Checking your plan…</p>;

  // No access object means this account has no merchant plan at all (for
  // example a super admin opening the merchant desk). Let the server decide.
  if (!access) return children;

  const unlocked = access.isUsable && (access.features || []).includes(feature);
  if (unlocked) return children;

  const needsPlan = !access.hasPlan || !access.isUsable;
  const label = title || feature;

  return (
    <Card className="max-w-xl">
      <PageTitle
        title={needsPlan ? "Choose a plan to continue" : `${label} is not in your plan`}
        subtitle={
          needsPlan
            ? access.messages?.[0] || "Start the free trial or pick a plan to unlock paid features."
            : `${label} is not included in your ${access.planCode} plan. Upgrade to unlock it.`
        }
      />
      <Link to="/merchant/billing">
        <Button>Go to billing</Button>
      </Link>
    </Card>
  );
}
