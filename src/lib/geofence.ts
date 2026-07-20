// Allowed time-in locations for Homes.ph.
// A user may only time in when physically within RADIUS_M meters of one of these.
export interface GeoSite {
  name: string;
  lat: number;
  lng: number;
}

export const ALLOWED_SITES: GeoSite[] = [
  { name: "Worknook Coworking Space", lat: 10.313119018813719, lng: 123.89390764567723 },
  { name: "Filipino Homes", lat: 10.303746475971979, lng: 123.89035400885079 },
];

// Max allowed distance from a site (meters).
// Tuned so ~8/18/24 m are allowed while ~32/50 m are denied.
export const RADIUS_M = 25;

// Great-circle distance between two coordinates, in meters (Haversine).
export function distanceMeters(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
): number {
  const R = 6371000; // earth radius (m)
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export interface NearestResult {
  site: GeoSite;
  distance: number; // meters to the closest site
  allowed: boolean;
}

// Returns the closest allowed site and whether the user is within range.
export function nearestSite(lat: number, lng: number): NearestResult {
  let best: NearestResult | null = null;
  for (const site of ALLOWED_SITES) {
    const distance = distanceMeters(lat, lng, site.lat, site.lng);
    if (!best || distance < best.distance) {
      best = { site, distance, allowed: distance <= RADIUS_M };
    }
  }
  // ALLOWED_SITES is never empty, so best is always set.
  return best!;
}

// Promise wrapper around the browser geolocation API.
export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation is not supported on this device."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
  });
}
