import { useEffect, useRef, useState } from "react";
import { loadMaps } from "../lib/maps";
import { inputClass } from "./ui";

// Merchant picker: search the shop or drop the pin by hand. The pin position is
// what the customer geofence is measured against, so it has to be exact.
export default function MapPicker({ latitude, longitude, radius = 100, onChange, onPlace }) {
  const hostRef = useRef(null);
  const searchRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);
  const [error, setError] = useState("");

  const lat = Number(latitude);
  const lng = Number(longitude);
  const hasPoint = Number.isFinite(lat) && Number.isFinite(lng);

  useEffect(() => {
    let cancelled = false;

    loadMaps()
      .then((maps) => {
        if (cancelled || !hostRef.current || mapRef.current) return;

        const center = hasPoint ? { lat, lng } : { lat: 20.5937, lng: 78.9629 };

        mapRef.current = new maps.Map(hostRef.current, {
          center,
          zoom: hasPoint ? 16 : 4,
          disableDefaultUI: true,
          zoomControl: true
        });

        markerRef.current = new maps.Marker({ position: center, map: mapRef.current, draggable: true });
        circleRef.current = new maps.Circle({
          center,
          radius: Number(radius) || 100,
          map: mapRef.current,
          strokeColor: "#6d28d9",
          strokeWeight: 1,
          fillColor: "#a78bfa",
          fillOpacity: 0.2
        });

        markerRef.current.addListener("dragend", () => {
          const point = markerRef.current.getPosition();
          onChange({ latitude: point.lat(), longitude: point.lng() });
        });

        mapRef.current.addListener("click", (event) => {
          markerRef.current.setPosition(event.latLng);
          onChange({ latitude: event.latLng.lat(), longitude: event.latLng.lng() });
        });

        // Optional search box. Only wired when Places is enabled on the key.
        if (searchRef.current && maps.places?.Autocomplete) {
          const autocomplete = new maps.places.Autocomplete(searchRef.current, {
            fields: ["geometry", "address_components"]
          });

          autocomplete.addListener("place_changed", () => {
            const place = autocomplete.getPlace();
            const point = place?.geometry?.location;

            if (!point) return;

            markerRef.current.setPosition(point);
            circleRef.current.setCenter(point);
            mapRef.current.setZoom(17);
            onChange({ latitude: point.lat(), longitude: point.lng() });

            if (onPlace) {
              const parts = place.address_components || [];
              const pick = (type) => parts.find((p) => p.types.includes(type))?.long_name || "";
              onPlace({
                line1: [pick("street_number"), pick("route")].filter(Boolean).join(" ") || place.name || "",
                city: pick("locality") || pick("administrative_area_level_2"),
                state: pick("administrative_area_level_1"),
                pincode: pick("postal_code")
              });
            }
          });
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Keeps the pin in sync when the form changes from elsewhere, for example the
  // "Use current GPS" button.
  useEffect(() => {
    if (!mapRef.current || !markerRef.current || !hasPoint) return;

    const point = { lat, lng };
    markerRef.current.setPosition(point);
    circleRef.current.setCenter(point);
    mapRef.current.panTo(point);
    mapRef.current.setZoom(16);
  }, [lat, lng, hasPoint]);

  useEffect(() => {
    circleRef.current?.setRadius(Number(radius) || 100);
  }, [radius]);

  return (
    <div className="space-y-2">
      {error ? <p className="text-xs text-muted">{error}</p> : null}
      <input ref={searchRef} className={inputClass} placeholder="Search your shop on Google Maps" />
      <div ref={hostRef} className="h-56 w-full rounded-2xl border border-line bg-raised" />
      <p className="text-xs text-muted">Tap the map or drag the pin to set the exact shop point.</p>
    </div>
  );
}
