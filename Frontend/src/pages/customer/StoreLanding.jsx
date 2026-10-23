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
import { Alert, Button, Card } from "../../components/ui";

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

  return (
    <div className="space-y-4">
      <div className="rounded-[2rem] border border-line bg-panel p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-purple">{store?.merchant?.businessType || "Store"}</p>
        <h1 className="mt-2 text-3xl font-semibold text-ink">{name}</h1>
        <p className="mt-1 text-sm text-muted">{tableNumber ? `Table ${tableNumber}` : store?.name || "Counter QR"}</p>
      </div>

      <Alert>{error}</Alert>

      {user ? (
        <Card className="space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-purple">What you have here</p>

          {program ? (
            <div className="space-y-2">
              <p className="text-sm text-ink">
                Stamps <span className="font-semibold text-purple">{stamps}/{required}</span>
                {" · "}
                {left} more stamp{left === 1 ? "" : "s"} for a reward
              </p>
              <div className="flex items-center gap-1">
                {Array.from({ length: required }, (_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 flex-1 rounded-full ${i < stamps ? "bg-purple" : "bg-raised"}`}
                  />
                ))}
              </div>
              <p className="text-xs text-muted">
                {loyalty?.card?.totalRewardsEarned || 0} reward
                {(loyalty?.card?.totalRewardsEarned || 0) === 1 ? "" : "s"} unlocked here ·{" "}
                {loyalty?.card?.totalStampsEarned || 0} stamps earned
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted">This shop is not running a stamp card.</p>
          )}

          {progress ? (
            <p className="text-xs text-muted">
              Visited on {progress.totalVisits} day{progress.totalVisits === 1 ? "" : "s"} ·{" "}
              {progress.untilNextCard} more for a gift card
            </p>
          ) : null}

          {progress?.rewardEarned ? (
            <p className="rounded-2xl bg-lavender px-3 py-2 text-sm font-semibold text-ink">
              That stamp filled your card. A reward is waiting in My rewards.
            </p>
          ) : null}

          {progress?.giftCard ? (
            <p className="rounded-2xl bg-lavender px-3 py-2 text-sm font-semibold text-ink">
              New gift card unlocked · {progress.giftCard.code}
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

      <Card className="space-y-3">
        <p className="text-sm text-muted">Confirm you are at this shop. Location is asked once and checked on the server.</p>
        <Button onClick={allowGps} className="w-full">
          {gps === "ok" ? "You are at the shop" : "Allow location"}
        </Button>
        {distance !== null ? (
          <p className="text-sm text-ink">
            You are <span className="font-semibold text-purple">{distance} m</span> away ·{" "}
            {inside ? "inside the zone" : `outside the ${radius} m zone`}
          </p>
        ) : null}
        {hasMapsKey() && shopPoint ? (
          <ShopMap shop={shopPoint} radius={radius} customer={coords} />
        ) : null}
      </Card>
      <div className="grid grid-cols-2 gap-3">
        <Link to={`/s/${code}/menu`}>
          <Button variant="ghost" className="w-full">{store?.orderingEnabled ? "Order food" : "Menu"}</Button>
        </Link>
        {store?.orderingEnabled ? (
          <>
            <Link to={`/s/${code}/cart`}><Button variant="ghost" className="w-full">Cart</Button></Link>
            <Link to={`/s/${code}/orders`}><Button variant="ghost" className="w-full">My orders</Button></Link>
          </>
        ) : null}
        <Link to={`/s/${code}/gift-cards`}><Button variant="ghost" className="w-full">Gift cards</Button></Link>
        {!user ? (
          <Link to="/login" state={{ from: `/s/${code}` }}><Button variant="ghost" className="w-full">Login</Button></Link>
        ) : null}
        <Link to={`/s/${code}/loyalty`}><Button variant="ghost" className="w-full">Stamps</Button></Link>
        <Link to={`/s/${code}/queue`}><Button variant="ghost" className="w-full">Queue</Button></Link>
      </div>
      {store?.merchant?.reviewUrl ? (
        <a href={store.merchant.reviewUrl} target="_blank" rel="noreferrer">
          <Button variant="accent" className="w-full">Google review</Button>
        </a>
      ) : null}
      {store?.merchant?.instagramUrl ? (
        <a href={store.merchant.instagramUrl} target="_blank" rel="noreferrer">
          <Button className="w-full">Instagram</Button>
        </a>
      ) : null}
    </div>
  );
}
