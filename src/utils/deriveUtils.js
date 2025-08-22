// get buildings order
// use mock data for now

/**
 * @param {{id:string, name?:string, lat:number, lng:number}[]} buildings
 * @param {{lat:number, lng:number}} userStart
 * @param {{speedKmh?:number, twoOptMaxSwaps?:number}} [opts]
 * @returns {{
 *   start: {lat:number, lng:number},
 *   route: Array<{order:number, id:string, name?:string, lat:number, lng:number}>,
 *   legs: Array<{from:{id:string,lat:number,lng:number}, to:{id:string,lat:number,lng:number}, distance_km:number}>,
 *   total_distance_km:number,
 *   est_duration_min:number,
 *   method:string
 * }}
 */

export function deriveBuildingOrder(buildings, userStart, opts = {}) {
  const speedKmh = opts.speedKmh ?? 4.5; // walking default
  const twoOptMaxSwaps = opts.twoOptMaxSwaps ?? 2000;

  if (!buildings || buildings.length === 0) {
    return {
      start: userStart,
      route: [],
      legs: [],
      total_distance_km: 0,
      est_duration_min: 0,
      method: "nearest-neighbor+2opt",
    };
  }

  // pick the nearest building to the user as the first stop
  const pool = buildings.slice();
  const startIdx = argMin(pool, (b) => haversineKm(userStart, b));
  const first = pool.splice(startIdx, 1)[0];

  // greedy nearest neighbor over the remaining buildings
  const route = [first];
  let current = first;
  while (pool.length) {
    const idx = argMin(pool, (b) => haversineKm(current, b));
    current = pool.splice(idx, 1)[0];
    route.push(current);
  }

  // improve with 2-opt (keeps the first in place)
  twoOpt(route, twoOptMaxSwaps);

  // compute legs (user -> first, then through route)
  const legs = [];
  let totalKm = 0;

  const d0 = haversineKm(userStart, route[0]);
  totalKm += d0;
  legs.push({
    from: { id: "__user__", lat: userStart.lat, lng: userStart.lng },
    to: { id: route[0].id, lat: route[0].lat, lng: route[0].lng },
    distance_km: round2(d0),
  });

  for (let i = 0; i < route.length - 1; i++) {
    const d = haversineKm(route[i], route[i + 1]);
    totalKm += d;
    legs.push({
      from: { id: route[i].id, lat: route[i].lat, lng: route[i].lng },
      to: { id: route[i + 1].id, lat: route[i + 1].lat, lng: route[i + 1].lng },
      distance_km: round2(d),
    });
  }

  const estMinutes = Math.round((totalKm / speedKmh) * 60);

  return {
    start: userStart,
    route: route.map((b, i) => ({ order: i + 1, ...b })),
    legs,
    total_distance_km: round2(totalKm),
    est_duration_min: estMinutes,
    method: "nearest-neighbor+2opt",
  };
}

/* ------------ helpers ------------ */
function haversineKm(a, b) {
  const R = 6371; // km
  const dLat = deg(b.lat - a.lat);
  const dLon = deg(b.lng - a.lng);
  const la1 = deg(a.lat);
  const la2 = deg(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
const deg = (x) => (x * Math.PI) / 180;
const round2 = (n) => Math.round(n * 100) / 100;

function argMin(arr, f) {
  let best = 0,
    val = Infinity;
  for (let i = 0; i < arr.length; i++) {
    const v = f(arr[i]);
    if (v < val) {
      val = v;
      best = i;
    }
  }
  return best;
}

// Simple 2-opt improvement; keeps the first node fixed
function twoOpt(route, maxSwaps = 2000) {
  if (route.length < 4) return;
  let improved = true,
    swaps = 0;

  const dist = (i, j) => haversineKm(route[i], route[j]);

  while (improved && swaps < maxSwaps) {
    improved = false;
    for (let i = 0; i < route.length - 3 && swaps < maxSwaps; i++) {
      for (let k = i + 2; k < route.length - 1 && swaps < maxSwaps; k++) {
        const a = i,
          b = i + 1,
          c = k,
          d = k + 1;
        const current = dist(a, b) + dist(c, d);
        const swapped = dist(a, c) + dist(b, d);
        if (swapped + 1e-9 < current) {
          reverseInPlace(route, b, c); // reverse segment [b..c]
          improved = true;
          swaps++;
        }
      }
    }
  }
}
function reverseInPlace(arr, i, j) {
  while (i < j) {
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
    i++;
    j--;
  }
}
