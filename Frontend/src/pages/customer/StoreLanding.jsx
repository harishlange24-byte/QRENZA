import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getPublicStore } from "../../api/store";
import { recordVisit } from "../../api/giftCard";
import { getErrorMessage } from "../../api/client";
import { distanceMeters, getCurrentPosition } from "../../lib/geo";
import { hasMapsKey } from "../../lib/maps";
import { useVisit } from "../../context/VisitContext";
import ShopMap from "../../components/ShopMap";
import { Alert, Button, Card } from "../../components/ui";

export default function StoreLanding() {
  const { code, tableNumber } = useParams();
  const { visit, setVisit } = useVisit();
  const [store, setStore] = useState(null);
  const [error, setError] = useState("");
  const [gps, setGps] = useState("idle");
  const [coords, setCoords] = useState(visit.coords);

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

  // Every scan counts as a visit for the gift card streak. Guests are not
  // logged in yet, so a 401 here is simply ignored.
  useEffect(() => {
    recordVisit(code).catch(() => {});
  }, [code]);

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

  return (
    <div className="space-y-4">
      <div className="rounded-[2rem] border border-line bg-panel p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-purple">{store?.merchant?.businessType || "Store"}</p>
        <h1 className="mt-2 text-3xl font-semibold text-ink">{name}</h1>
        <p className="mt-1 text-sm text-muted">{tableNumber ? `Table ${tableNumber}` : store?.name || "Counter QR"}</p>
      </div>
      <Alert>{error}</Alert>
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
        <Link to="/login" state={{ from: `/s/${code}` }}><Button variant="ghost" className="w-full">Login</Button></Link>
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
