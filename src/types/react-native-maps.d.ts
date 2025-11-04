declare module "react-native-maps" {
  import * as React from "react";
  import { ViewProps } from "react-native";

  export type LatLng = {
    latitude: number;
    longitude: number;
  };

  export type EdgePadding = {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };

  export type Region = {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };

  export interface FitToCoordinatesOptions {
    edgePadding?: EdgePadding;
    animated?: boolean;
  }

  export interface MapViewProps extends ViewProps {
    provider?: "google" | "apple";
    customMapStyle?: Record<string, unknown>[];
    initialRegion?: Region;
    onMapReady?: () => void;
    onRegionChange?: (region: Region) => void;
    onRegionChangeComplete?: (region: Region) => void;
  }

  export default class MapView extends React.Component<MapViewProps> {
    fitToCoordinates(coordinates: LatLng[], options?: FitToCoordinatesOptions): void;
    pointForCoordinate(coordinate: LatLng): Promise<{ x: number; y: number }>;
  }

  export const PROVIDER_GOOGLE: "google";

  export interface PolygonProps {
    coordinates: LatLng[];
    holes?: LatLng[][];
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
  }

  export class Polygon extends React.Component<PolygonProps> {}

  export interface PolylineProps {
    coordinates: LatLng[];
    strokeColor?: string;
    strokeWidth?: number;
    lineCap?: "round" | "butt" | "square";
    lineJoin?: "round" | "miter" | "bevel";
  }

  export class Polyline extends React.Component<PolylineProps> {}

  export interface CircleProps {
    center: LatLng;
    radius: number;
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
  }

  export class Circle extends React.Component<CircleProps> {}
}
