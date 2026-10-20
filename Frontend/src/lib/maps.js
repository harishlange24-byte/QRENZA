const KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// The Maps script is pulled in on demand so no customer page pays for it until a
// map is actually shown. When no key is set the app keeps working without maps.
let loader = null;

export function hasMapsKey() {
  return Boolean(KEY);
}

export function loadMaps() {
  if (!KEY) {
    return Promise.reject(new Error("Google Maps API key is not configured"));
  }
  if (window.google?.maps) {
    return Promise.resolve(window.google.maps);
  }
  if (loader) {
    return loader;
  }

  loader = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${KEY}&libraries=places&loading=async`;
    script.async = true;
    script.onload = () => resolve(window.google.maps);
    script.onerror = () => reject(new Error("Unable to load Google Maps"));
    document.head.appendChild(script);
  });

  return loader;
}
