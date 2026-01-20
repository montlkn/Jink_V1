import { DESIGNER_REPUBLIC_THEME as theme } from "@/theme/designer_republic";

export type MapStyleElement = {
  elementType?: string;
  featureType?: string;
  stylers: Record<string, unknown>[];
};

export const PAST_WALKS_NOLLI_MAP_STYLE: MapStyleElement[] = [
  { elementType: "labels", stylers: [{ visibility: "off" }] },
  { elementType: "geometry", stylers: [{ color: theme.colors.white }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: theme.colors.white }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: theme.colors.white }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: theme.colors.white }] },
  { featureType: "road", elementType: "geometry.fill", stylers: [{ color: theme.colors.white }] },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [
      { color: theme.colors.black },
      { weight: 0.8 },
    ],
  },
  { featureType: "landscape.man_made", elementType: "geometry", stylers: [{ color: theme.colors.black }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: theme.colors.white }] },
];
