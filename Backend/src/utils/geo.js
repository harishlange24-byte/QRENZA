const EARTH_RADIUS_M = 6371000;

const toRad = (degrees) => (degrees * Math.PI) / 180;

// Distance between two lat/lng points in whole metres. Plain haversine keeps the
// geofence check offline, so no Google call is needed on the server.
const distanceMeters = (from, to) => {
    const dLat = toRad(to.latitude - from.latitude);
    const dLng = toRad(to.longitude - from.longitude);
    const lat1 = toRad(from.latitude);
    const lat2 = toRad(to.latitude);

    const h = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

    return Math.round(2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h)));
};

// The store stores its point as GeoJSON, which is [longitude, latitude].
const storePoint = (store) => {
    const coordinates = store?.location?.coordinates;

    if(!Array.isArray(coordinates) || coordinates.length !== 2){
        return null;
    }

    return {
        latitude : Number(coordinates[1]),
        longitude : Number(coordinates[0])
    };
};

// Accepts the coordinates sent by the customer app and returns null when they
// are missing or outside the valid range.
const readCoords = (body) => {
    const latitude = Number(body?.latitude);
    const longitude = Number(body?.longitude);

    if(!Number.isFinite(latitude) || !Number.isFinite(longitude)){
        return null;
    }

    if(latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180){
        return null;
    }

    return {latitude, longitude};
};

export {distanceMeters, storePoint, readCoords};
