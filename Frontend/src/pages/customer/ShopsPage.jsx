import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { listPublicStores } from "../../api/store";
import { getErrorMessage } from "../../api/client";
import { distanceMeters, getCurrentPosition } from "../../lib/geo";
import SiteHeader from "../../components/SiteHeader";
import { Alert, Button, Card, Empty, PageTitle } from "../../components/ui";

// Stores keep their point as GeoJSON, which is [longitude, latitude].
const shopPoint = (shop) => {
  const coords = shop.location?.coordinates;
  return Array.isArray(coords) && coords.length === 2
    ? { latitude: coords[1], longitude: coords[0] }
    : null;
};

const distanceText = (metres) => {
  if (metres === null) return "";
  return metres < 1000 ? `${metres} m away` : `${(metres / 1000).toFixed(1)} km away`;
};

export default function ShopsPage() {
  const user = useSelector((s) => s.auth.user);
  const [shops, setShops] = useState([]);
  const [totals, setTotals] = useState(null);
  const [coords, setCoords] = useState(null);
  const [gps, setGps] = useState("idle");
  const [onlyEvents, setOnlyEvents] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    listPublicStores()
      .then(({ data }) => {
        setShops(data.data?.shops || []);
        setTotals(data.data?.totals || null);
      })
      .catch((e) => setError(getErrorMessage(e)));
  }, []);

  async function locate() {
    try {
      setCoords(await getCurrentPosition());
      setGps("ok");
      setError("");
    } catch (e) {
      setGps("denied");
      setError(e.message);
    }
  }

  const rows = useMemo(() => {
    const measured = shops.map((shop) => {
      const point = shopPoint(shop);
      return { ...shop, distance: point && coords ? distanceMeters(coords, point) : null };
    });

    const kept = onlyEvents
      ? measured.filter((shop) => shop.stamps.running || shop.rewards.running || shop.giftCards?.running)
      : measured;

    if (!coords) return kept;

    // Nearest first once we actually know where the customer is standing.
    return [...kept].sort((a, b) => {
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    });
  }, [shops, coords, onlyEvents]);

  return (
    <div className="min-h-screen bg-paper">
      <SiteHeader />
      <div className="mx-auto max-w-3xl space-y-4 px-5 pb-16 lg:max-w-5xl">
        <PageTitle title="Shops on Qrenza" subtitle="Every shop, near and far, with the rewards they are running" />

        <Alert>{error}</Alert>

        {totals ? (
          <Card className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
            <div>
              <p className="text-2xl font-semibold text-purple">{totals.shops}</p>
              <p className="text-xs text-muted">shops visited</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-purple">{totals.stamps}</p>
              <p className="text-xs text-muted">stamps collected</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-purple">{totals.rewards}</p>
              <p className="text-xs text-muted">rewards won</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-purple">{totals.giftCards}</p>
              <p className="text-xs text-muted">gift cards in hand</p>
            </div>
            {totals.activeRewards > 0 ? (
              <p className="col-span-2 rounded-2xl bg-lavender px-3 py-2 text-sm font-semibold text-ink sm:col-span-4">
                {totals.activeRewards} reward{totals.activeRewards === 1 ? "" : "s"} still unused — show the code at
                the counter.
              </p>
            ) : null}
          </Card>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button variant={gps === "ok" ? "accent" : "ghost"} onClick={locate}>
            {gps === "ok" ? "Sorted by distance" : "Use my location"}
          </Button>
          <Button variant={onlyEvents ? "primary" : "ghost"} onClick={() => setOnlyEvents((on) => !on)}>
            {onlyEvents ? "Showing events only" : "Only shops with events"}
          </Button>
        </div>

        {rows.length === 0 && !error ? (
          <Empty title="No shops to show" text="Once a shop joins Qrenza it shows up here." />
        ) : null}

        {rows.map((shop) => (
          <Card key={shop.code} className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-purple">
                  {shop.businessType || "Shop"}
                </p>
                <p className="text-lg font-semibold text-ink">{shop.businessName || shop.name}</p>
                <p className="text-sm text-muted">
                  {shop.name}
                  {shop.address?.city ? ` · ${shop.address.city}` : ""}
                </p>
                {shop.distance !== null ? (
                  <p className="text-xs font-semibold text-purple">{distanceText(shop.distance)}</p>
                ) : null}
              </div>
              {shop.logo ? (
                <img src={shop.logo} alt="" className="h-12 w-12 rounded-xl object-cover" />
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              {shop.stamps.running ? (
                <span className="rounded-full bg-purple px-2 py-1 font-semibold text-white">
                  Stamps on · {shop.stamps.stampsRequired} in a card
                </span>
              ) : (
                <span className="rounded-full bg-raised px-2 py-1 text-muted">No stamps event</span>
              )}
              {shop.rewards.running ? (
                <span className="rounded-full bg-lavender px-2 py-1 font-semibold text-ink">
                  {shop.rewards.count} reward{shop.rewards.count === 1 ? "" : "s"} to win
                </span>
              ) : (
                <span className="rounded-full bg-raised px-2 py-1 text-muted">No rewards event</span>
              )}
              {shop.giftCards?.running ? (
                <span className="rounded-full bg-lavender px-2 py-1 font-semibold text-ink">
                  {shop.giftCards.count} gift card{shop.giftCards.count === 1 ? "" : "s"} running
                </span>
              ) : null}
            </div>

            {shop.stamps.running && shop.stamps.rewardText ? (
              <p className="rounded-2xl bg-raised px-3 py-2 text-xs text-ink">
                {shop.stamps.stampsRequired} stamps and you get{" "}
                <span className="font-semibold text-purple">{shop.stamps.rewardText}</span>
              </p>
            ) : null}

            {shop.rewards.running && shop.rewards.names?.length ? (
              <p className="text-xs text-muted">Prizes on the scratch card: {shop.rewards.names.join(", ")}</p>
            ) : null}

            {shop.mine ? (
              <div className="rounded-2xl bg-raised p-3 text-sm">
                <p className="text-ink">
                  Your card here{" "}
                  <span className="font-semibold text-purple">
                    {shop.mine.stamps}/{shop.mine.stampsRequired}
                  </span>
                  {" · "}
                  {shop.mine.stampsLeft} stamp{shop.mine.stampsLeft === 1 ? "" : "s"} left
                </p>
                <p className="mt-1 text-xs text-muted">
                  {shop.mine.totalRewardsEarned} reward{shop.mine.totalRewardsEarned === 1 ? "" : "s"} unlocked
                  {shop.mine.activeRewards > 0 ? ` · ${shop.mine.activeRewards} ready to use` : ""}
                  {shop.mine.giftCards > 0 ? ` · ${shop.mine.giftCards} gift card${shop.mine.giftCards === 1 ? "" : "s"}` : ""}
                  {shop.mine.visits > 0 ? ` · ${shop.mine.visits} visit${shop.mine.visits === 1 ? "" : "s"}` : ""}
                </p>
              </div>
            ) : null}

            <Link to={`/s/${shop.code}`}>
              <Button className="w-full">Open shop</Button>
            </Link>
          </Card>
        ))}

        {!user ? (
          <Card className="text-center">
            <p className="text-sm text-muted">
              <Link className="font-semibold text-purple" to="/login">Log in with your phone</Link>{" "}
              to keep your stamps and rewards across every shop.
            </p>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
