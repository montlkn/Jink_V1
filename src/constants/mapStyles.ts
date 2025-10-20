export type MapStyleElement = {
  elementType?: string;
  featureType?: string;
  stylers: Array<Record<string, unknown>>;
};

export const PAST_WALKS_NOLLI_MAP_STYLE: MapStyleElement[] = [
  { elementType: "labels", stylers: [{ visibility: "off" }] },
  { elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#ffffff" }] },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [
      { color: "#000000" },
      { weight: 0.8 },
    ],
  },
  { featureType: "landscape.man_made", elementType: "geometry", stylers: [{ color: "#000000" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
];
