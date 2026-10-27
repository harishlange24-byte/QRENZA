import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { listPublicStores } from "../../api/store";
import { getErrorMessage } from "../../api/client";
import { distanceMeters, getCurrentPosition } from "../../lib/geo";
import SiteHeader from "../../components/SiteHeader";
import { Alert, Badge, Button, Card, Empty, PageTitle, StatTile, Skeleton, inputClass } from "../../components/ui";
import { Icon } from "../../components/icons";

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
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    listPublicStores()
      .then(({ data }) => {
        setShops(data.data?.shops || []);
        setTotals(data.data?.totals || null);
      })
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
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

    // Client-side text search over the shops we already fetched.
    const query = search.trim().toLowerCase();
    const searched = query
      ? kept.filter((shop) =>
          [shop.businessName, shop.name, shop.businessType, shop.address?.city]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(query))
        )
      : kept;

    if (!coords) return searched;

    // Nearest first once we actually know where the customer is standing.
    return [...searched].sort((a, b) => {
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    });
  }, [shops, coords, onlyEvents, search]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-paper">
      <SiteHeader />

      <div className="mx-auto max-w-6xl px-5 pb-20">
        <PageTitle
          eyebrow="Discover"
          title="Shops on Qrenza"
          subtitle="Every shop, near and far, with the rewards they are running"
        />

        <div className="space-y-4">
          <Alert>{error}</Alert>

          {totals ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatTile label="Shops visited" value={totals.shops} tone="purple" icon={<Icon name="store" className="h-4 w-4" />} />
              <StatTile label="Stamps collected" value={totals.stamps} tone="mint" icon={<Icon name="stamp" className="h-4 w-4" />} />
              <StatTile label="Rewards won" value={totals.rewards} tone="amber" icon={<Icon name="reward" className="h-4 w-4" />} />
              <StatTile label="Gift cards in hand" value={totals.giftCards} tone="rose" icon={<Icon name="gift" className="h-4 w-4" />} />
              {totals.activeRewards > 0 ? (
                <p className="col-span-full rounded-2xl border border-lilac bg-lavender px-4 py-3 text-sm font-semibold text-ink sm:col-span-2 xl:col-span-4">
                  {totals.activeRewards} reward{totals.activeRewards === 1 ? "" : "s"} still unused — show the code at
                  the counter.
                </p>
              ) : null}
            </div>
          ) : null}

          {/* Controls: location sort, event filter and a client-side search. */}
          <Card className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
                <Icon name="list" className="h-4 w-4" />
              </span>
              <input
                className={`${inputClass} pl-10`}
                placeholder="Search by shop, type or city"
                aria-label="Search shops"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant={gps === "ok" ? "accent" : "ghost"} onClick={locate}>
                <Icon name="spark" className="h-4 w-4" />
                {gps === "ok" ? "Sorted by distance" : "Use my location"}
              </Button>
              <Button variant={onlyEvents ? "primary" : "ghost"} onClick={() => setOnlyEvents((on) => !on)}>
                {onlyEvents ? "Showing events only" : "Only shops with events"}
              </Button>
            </div>
          </Card>

          {/* Loading skeleton */}
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <Card key={`sk-${i}`} className="space-y-4">
                  <Skeleton className="h-20 w-full rounded-3xl" />
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="flex gap-2">
                    <Skeleton className="h-7 w-24 rounded-full" />
                    <Skeleton className="h-7 w-20 rounded-full" />
                  </div>
                  <Skeleton className="h-10 w-full rounded-2xl" />
                </Card>
              ))}
            </div>
          ) : null}

          {/* Empty state */}
          {!loading && rows.length === 0 && !error ? (
            <Empty
              title="No shops to show"
              text={search ? "No shop matches that search yet. Try a different name or city." : "Once a shop joins Qrenza it shows up here."}
            />
          ) : null}

          {/* Shop grid */}
          {!loading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {rows.map((shop) => (
                <Card key={shop.code} hover className="flex h-full flex-col gap-4">
                  {/* Gradient cover header */}
                  <div className="relative overflow-hidden rounded-3xl bg-[linear-gradient(135deg,#3b0f8f_0%,#6d28d9_60%,#8b5cf6_100%)] px-5 pb-6 pt-5">
                    <div className="q-dots pointer-events-none absolute inset-0 opacity-25" />
                    <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-lilac/30 blur-2xl" />
                    <div className="relative flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.2em] text-white/70">
                          {shop.businessType || "Shop"}
                        </p>
                        <p className="mt-1 text-lg font-semibold text-white">{shop.businessName || shop.name}</p>
                      </div>
                      {shop.logo ? (
                        <img src={shop.logo} alt="" className="h-12 w-12 rounded-2xl border border-white/30 object-cover" />
                      ) : (
                        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/15 text-base font-bold text-white backdrop-blur">
                          {(shop.businessName || shop.name || "Q").charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="relative mt-3 flex flex-wrap items-center gap-3 text-xs text-white/85">
                      <span className="inline-flex items-center gap-1.5">
                        <Icon name="store" className="h-3.5 w-3.5" />
                        {shop.name}
                        {shop.address?.city ? ` · ${shop.address.city}` : ""}
                      </span>
                      {shop.distance !== null ? (
                        <span className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
                          {distanceText(shop.distance)}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col gap-3">
                    <div className="flex flex-wrap gap-2">
                      {shop.stamps.running ? (
                        <Badge tone="purple">Stamps on · {shop.stamps.stampsRequired} in a card</Badge>
                      ) : (
                        <Badge tone="neutral">No stamps event</Badge>
                      )}
                      {shop.rewards.running ? (
                        <Badge tone="amber">{shop.rewards.count} reward{shop.rewards.count === 1 ? "" : "s"} to win</Badge>
                      ) : (
                        <Badge tone="neutral">No rewards event</Badge>
                      )}
                      {shop.giftCards?.running ? (
                        <Badge tone="mint">{shop.giftCards.count} gift card{shop.giftCards.count === 1 ? "" : "s"} running</Badge>
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
                      <div className="rounded-2xl border border-lilac bg-lavender/60 p-3 text-sm">
                        <p className="flex items-center gap-2 text-ink">
                          <Icon name="reward" className="h-4 w-4 text-purple" />
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

                    <div className="mt-auto pt-1">
                      <Link to={`/s/${shop.code}`}>
                        <Button className="w-full">
                          Open shop
                          <Icon name="chevron" className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : null}

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
    </div>
  );
}
