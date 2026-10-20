import { useEffect, useRef, useState } from "react";
import { loadMaps } from "../lib/maps";

// Display map: shop pin, its geofence ring and, once the customer allows
// location, their own pin. Only rendered when a Maps key is configured.
export default function ShopMap({ shop, radius = 100, customer = null, height = 240 }) {
  const hostRef = useRef(null);
  const mapRef = useRef(null);
  const shopMarkerRef = useRef(null);
  const circleRef = useRef(null);
  const meMarkerRef = useRef(null);
  const [error, setError] = useState("");

  const shopLat = Number(shop?.latitude);
  const shopLng = Number(shop?.longitude);
  const meLat = Number(customer?.latitude);
  const meLng = Number(customer?.longitude);

  useEffect(() => {
    let cancelled = false;

    loadMaps()
      .then((maps) => {
        if (cancelled || !hostRef.current) return;

        const center = { lat: shopLat, lng: shopLng };

        if (!mapRef.current) {
          mapRef.current = new maps.Map(hostRef.current, {
            center,
            zoom: 16,
            disableDefaultUI: true,
            zoomControl: true
          });
          shopMarkerRef.current = new maps.Marker({ position: center, map: mapRef.current, title: "Shop" });
          circleRef.current = new maps.Circle({
            center,
            radius,
            map: mapRef.current,
            strokeColor: "#6d28d9",
            strokeWeight: 1,
            fillColor: "#a78bfa",
            fillOpacity: 0.2
          });
        } else {
          shopMarkerRef.current.setPosition(center);
          circleRef.current.setCenter(center);
          circleRef.current.setRadius(radius);
        }

        if (Number.isFinite(meLat) && Number.isFinite(meLng)) {
          const me = { lat: meLat, lng: meLng };

          if (!meMarkerRef.current) {
            meMarkerRef.current = new maps.Marker({ position: me, map: mapRef.current, title: "You" });
          } else {
            meMarkerRef.current.setPosition(me);
          }

          const bounds = new maps.LatLngBounds();
          bounds.extend(center);
          bounds.extend(me);
          mapRef.current.fitBounds(bounds, 40);
        } else {
          mapRef.current.panTo(center);
          mapRef.current.setZoom(16);
        }

        setError("");
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });

    return () => {
      cancelled = true;
    };
  }, [shopLat, shopLng, radius, meLat, meLng]);

  if (error) {
    return <p className="text-xs text-muted">{error}</p>;
  }

  return <div ref={hostRef} style={{ height }} className="w-full rounded-2xl border border-line bg-raised" />;
}
