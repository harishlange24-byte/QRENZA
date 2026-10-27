import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { getPublicStore } from "../../api/store";
import { recordVisit } from "../../api/giftCard";
import { getMyLoyalty } from "../../api/loyalty";
import { getMyOrders } from "../../api/order";
import { getErrorMessage } from "../../api/client";
import { distanceMeters, getCurrentPosition } from "../../lib/geo";
import { hasMapsKey } from "../../lib/maps";
import { useVisit } from "../../context/VisitContext";
import ShopMap from "../../components/ShopMap";
import { Icon } from "../../components/icons";
import { Alert, Badge, Button, Card } from "../../components/ui";

const ORDER_LINE = {
  PLACED: "Sent to the kitchen",
  ACCEPTED: "Kitchen accepted it",
  PREPARING: "Being prepared",
  READY: "Ready to collect",
  SERVED: "Served",
  CANCELLED: "Cancelled"
};

export default function StoreLanding() {
  const { code, tableNumber } = useParams();
  const { visit, setVisit } = useVisit();
  const user = useSelector((s) => s.auth.user);
  const ready = useSelector((s) => s.auth.ready);
  const [store, setStore] = useState(null);
  const [error, setError] = useState("");
  const [gps, setGps] = useState("idle");
  const [coords, setCoords] = useState(visit.coords);
  const [progress, setProgress] = useState(null);
  const [loyalty, setLoyalty] = useState(null);
  const [order, setOrder] = useState(null);

  useEffect(() => {
    let live = true;
    getPublicStore(code)
      .then(({ data }) => {
        if (!live) return;
        setStore(data.store);
        setVisit((v) => ({ ...v, code, tableNumber: tableNumber || "", store: data.store }));
      })
      .catch((e) => setError(getErrorMessage(e)));
    return () => {
      live = false;
    };
  }, [code, tableNumber, setVisit]);

  // The scan itself is the visit: it grows the gift card streak and, on shops
  // that stamp per visit, it moves the stamp card as well. Guests have no
  // session yet, so the whole block waits for the session check.
  useEffect(() => {
    if (!ready) return;

    if (!user) {
      setProgress(null);
      setLoyalty(null);
      setOrder(null);
      return;
    }

    let live = true;
    const keep = (setter) => ({ data }) => {
      if (live) setter(data.data || null);
    };
    const skip = () => {};

    recordVisit(code).then(keep(setProgress)).catch(skip);
    getMyLoyalty(code).then(keep(setLoyalty)).catch(skip);
    getMyOrders(code)
      .then(({ data }) => {
        if (live) setOrder(data.data?.orders?.[0] || null);
      })
      .catch(skip);

    return () => {
      live = false;
    };
  }, [code, ready, user]);

  async function allowGps() {
    try {
      const position = await getCurrentPosition();
      setCoords(position);
      setGps("ok");
      setError("");
      setVisit((v) => ({ ...v, coords: position, gpsAllowed: true }));
    } catch (e) {
      setGps("denied");
      setError(e.message);
    }
  }

  const name = store?.merchant?.businessName || store?.name || code;

  // Stores keep their point as GeoJSON, which is [longitude, latitude].
  const shopPoint = store?.location?.coordinates?.length === 2
    ? { latitude: store.location.coordinates[1], longitude: store.location.coordinates[0] }
    : null;
  const radius = store?.geofenceRadius || 100;
  const distance = shopPoint && coords ? distanceMeters(coords, shopPoint) : null;
  const inside = distance !== null && distance <= radius;

  const program = loyalty?.program || null;
  const stamps = loyalty?.card?.stamps || 0;
  const required = program?.stampsRequired || 10;
  const left = Math.max(0, required - stamps);

  const quickActions = [
    { to: `/s/${code}/menu`, icon: "list", label: store?.orderingEnabled ? "Order food" : "Menu", hint: "Live prices" },
    { to: `/s/${code}/queue`, icon: "queue", label: "Queue", hint: "Skip the wait" },
    { to: `/s/${code}/loyalty`, icon: "stamp", label: "Stamps", hint: `${stamps}/${required}` },
    { to: `/s/${code}/feedback`, icon: "chat", label: "Rate us", hint: "How was it?" },
    { to: `/s/${code}/gift-cards`, icon: "gift", label: "Gift cards", hint: "Offers inside" },
    ...(store?.orderingEnabled
      ? [
          { to: `/s/${code}/orders`, icon: "bag", label: "My orders", hint: "Live status" },
          { to: `/s/${code}/cart`, icon: "cart", label: "Cart", hint: "Review basket" }
        ]
      : []),
    ...(!user ? [{ to: "/login", state: { from: `/s/${code}` }, icon: "phone", label: "Login", hint: "Save your card" }] : [])
  ];

  return (
    <div className="space-y-5">
      {/* ---------------------------------------------------------------
          Store hero. Four stacked layers: gradient wash, blueprint grid,
          aurora blobs, then the glass identity strip.
          --------------------------------------------------------------- */}
      <section className="q-fade-up relative isolate overflow-hidden rounded-4xl bg-[linear-gradient(135deg,#1a0b3d_0%,#3b0f8f_45%,#6d28d9_100%)] px-5 py-6 text-white shadow-lift">
        <div className="q-grid pointer-events-none absolute inset-0 opacity-25" />
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-lilac/40 blur-3xl q-float" />
        <div className="pointer-events-none absolute -bottom-20 -left-12 h-56 w-56 rounded-full bg-glow/25 blur-3xl q-float-slow" />

        <div className="relative flex items-start gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/20 bg-white/15 text-lg font-black backdrop-blur">
            {store?.merchant?.logo ? (
              <img src={store.merchant.logo} alt={name} className="h-full w-full object-cover" />
            ) : (
              <span>{(name || "Q").trim().slice(0, 1).toUpperCase()}</span>
            )}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/90">
                {store?.merchant?.businessType || "Store"}
              </span>
              {tableNumber ? (
                <span className="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-deep">
                  Table {tableNumber}
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/90">
                  Counter QR
                </span>
              )}
            </div>

            <h1 className="mt-3 text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">{name}</h1>
            <p className="mt-1 truncate text-sm text-white/70">
              {tableNumber ? `Table ${tableNumber}` : store?.address || store?.name || "Scan · earn · repeat"}
            </p>
          </div>
        </div>

        <div className="relative mt-5 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90">
            <Icon name="spark" className="h-3.5 w-3.5" />
            Scan once, the shop remembers you
          </span>
          {store?.orderingEnabled ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90">
              <Icon name="cart" className="h-3.5 w-3.5" />
              Ordering open
            </span>
          ) : null}
        </div>
      </section>

      <Alert>{error}</Alert>

      {user ? (
        <Card className="q-fade-up q-delay-1 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-purple">What you have here</p>
            <Badge tone="purple">Member</Badge>
          </div>

          {program ? (
            <div className="rounded-3xl border border-line bg-raised p-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-muted">Stamp card</p>
                  <p className="mt-1 text-2xl font-semibold tracking-tight text-ink">
                    {stamps}
                    <span className="text-base font-medium text-muted">/{required}</span>
                  </p>
                </div>
                <p className="text-right text-xs leading-relaxed text-muted">
                  {left} more stamp{left === 1 ? "" : "s"}
                  <br />
                  for a reward
                </p>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                <span
                  className="block h-full rounded-full bg-[linear-gradient(90deg,#6d28d9,#a78bfa)] transition-all duration-700"
                  style={{ width: `${Math.min(100, (stamps / required) * 100)}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted">
                {loyalty?.card?.totalRewardsEarned || 0} reward
                {(loyalty?.card?.totalRewardsEarned || 0) === 1 ? "" : "s"} unlocked here ·{" "}
                {loyalty?.card?.totalStampsEarned || 0} stamps earned
              </p>
            </div>
          ) : (
            <p className="rounded-2xl bg-raised px-4 py-3 text-sm text-muted">This shop is not running a stamp card.</p>
          )}

          {progress ? (
            <p className="text-xs text-muted">
              Visited on {progress.totalVisits} day{progress.totalVisits === 1 ? "" : "s"} ·{" "}
              {progress.untilNextCard} more for a gift card
            </p>
          ) : null}

          {progress?.rewardEarned ? (
            <p className="rounded-2xl border border-purple/20 bg-lavender px-4 py-3 text-sm font-semibold text-ink">
              That stamp filled your card. A reward is waiting in My rewards.
            </p>
          ) : null}

          {progress?.giftCard ? (
            <p className="rounded-2xl border border-purple/20 bg-lavender px-4 py-3 text-sm font-semibold text-ink">
              New gift card unlocked · <span className="font-mono tracking-wide">{progress.giftCard.code}</span>
            </p>
          ) : null}

          {order ? (
            <p className="text-sm text-ink">
              Last order: <span className="font-semibold text-purple">{ORDER_LINE[order.status] || order.status}</span>
              {" · "}₹{order.total}
            </p>
          ) : null}

          <div className="grid grid-cols-3 gap-2">
            <Link to={`/s/${code}/loyalty`}><Button variant="ghost" className="w-full">Stamps</Button></Link>
            <Link to={`/s/${code}/rewards`}><Button variant="ghost" className="w-full">Rewards</Button></Link>
            <Link to={`/s/${code}/orders`}><Button variant="ghost" className="w-full">Orders</Button></Link>
          </div>
        </Card>
      ) : null}

      <Card className="q-fade-up q-delay-2 space-y-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-lavender text-purple">
            <Icon name="shield" className="h-5 w-5" />
          </span>
          <div>
            <p className="font-semibold text-ink">Confirm you are here</p>
            <p className="text-xs text-muted">Location is asked once and checked on the server.</p>
          </div>
        </div>

        <Button onClick={allowGps} className="w-full">
          {gps === "ok" ? "You are at the shop" : "Allow location"}
        </Button>

        {distance !== null ? (
          <p className="text-sm text-ink">
            You are <span className="font-semibold text-purple">{distance} m</span> away ·{" "}
            {inside ? (
              <span className="text-mint">inside the zone</span>
            ) : (
              <span className="text-amber">outside the {radius} m zone</span>
            )}
          </p>
        ) : null}

        {hasMapsKey() && shopPoint ? (
          <ShopMap shop={shopPoint} radius={radius} customer={coords} />
        ) : null}
      </Card>

      {/* Quick actions: the four things a guest actually does at the table. */}
      <div className="q-fade-up q-delay-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {quickActions.map((action) => (
          <Link key={action.label} to={action.to} state={action.state} className="block">
            <Card hover className="flex h-full flex-col gap-3 p-4">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-lavender text-purple">
                <Icon name={action.icon} className="h-5 w-5" />
              </span>
              <span className="mt-auto">
                <span className="block font-semibold leading-tight text-ink">{action.label}</span>
                <span className="mt-0.5 block text-xs text-muted">{action.hint}</span>
              </span>
            </Card>
          </Link>
        ))}
      </div>

      {store?.merchant?.reviewUrl ? (
        <a href={store.merchant.reviewUrl} target="_blank" rel="noreferrer" className="block">
          <Button variant="accent" className="w-full">
            <Icon name="stamp" className="h-4 w-4" />
            Leave a Google review
          </Button>
        </a>
      ) : null}
      {store?.merchant?.instagramUrl ? (
        <a href={store.merchant.instagramUrl} target="_blank" rel="noreferrer" className="block">
          <Button className="w-full">
            <Icon name="spark" className="h-4 w-4" />
            Follow on Instagram
          </Button>
        </a>
      ) : null}
    </div>
  );
}
