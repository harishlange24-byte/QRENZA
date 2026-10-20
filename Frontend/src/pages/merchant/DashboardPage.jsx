import { Link } from "react-router-dom";
import { Card, PageTitle } from "../../components/ui";
import { useMerchantStore } from "../../context/MerchantStoreContext";

const tiles = [
  ["Stores & QR", "Print codes for tables and the counter", "/merchant/stores"],
  ["Menu", "Categories, prices, out of stock", "/merchant/menu"],
  ["Loyalty", "Stamp program and cashier stamp", "/merchant/loyalty"],
  ["Queue", "Call, serve, skip", "/merchant/queue"],
  ["Rewards", "Scratch odds and redeem codes", "/merchant/rewards"],
  ["Feedback", "Private issues vs public reviews", "/merchant/feedback"],
  ["CRM", "Who visits, who went quiet", "/merchant/crm"],
  ["Campaigns", "WhatsApp follow-ups", "/merchant/campaigns"],
  ["Analytics", "Visits and redemption", "/merchant/analytics"]
];

export default function DashboardPage() {
  const { stores, storeId } = useMerchantStore();
  const active = stores.find((s) => s.id === storeId);

  return (
    <div>
      <PageTitle
        title={active ? active.name : "Merchant desk"}
        subtitle="One store at a time. Customer lists never mix between shops."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map(([label, text, to]) => (
          <Link key={to} to={to}>
            <Card className="h-full transition hover:border-purple">
              <p className="font-semibold text-ink">{label}</p>
              <p className="mt-1 text-xs text-muted">{text}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
