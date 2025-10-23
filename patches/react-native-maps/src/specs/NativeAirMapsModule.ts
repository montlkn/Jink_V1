import type {TurboModule} from 'react-native';
import {TurboModuleRegistry} from 'react-native';
import type {Double} from 'react-native/Libraries/Types/CodegenTypes';
import type {Camera, Address} from '../MapView.types';

type NativeLatLng = {
  latitude: Double;
  longitude: Double;
};

type NativePoint = {
  x: Double;
  y: Double;
};

export type Region = {
  latitude: Double;
  longitude: Double;
  latitudeDelta: Double;
  longitudeDelta: Double;
};

export type MapBoundaries = {northEast: NativeLatLng; southWest: NativeLatLng};

export interface Spec extends TurboModule {
  getCamera(tag: Double): Promise<Camera>;
  getMarkersFrames(tag: Double, onlyVisible: boolean): Promise<unknown>;
  getMapBoundaries(tag: Double): Promise<MapBoundaries>;
  takeSnapshot(tag: Double, config: string): Promise<string>;
  getAddressFromCoordinates(
    tag: Double,
    coordinate: NativeLatLng,
  ): Promise<Address>;
  getPointForCoordinate(
    tag: Double,
    coordinate: NativeLatLng,
  ): Promise<NativePoint>;
  getCoordinateForPoint(
    tag: Double,
    point: NativePoint,
  ): Promise<NativeLatLng>;
}

const module = TurboModuleRegistry.get<Spec>('RNMapsAirModule');

const unsupported = (method: string) => () =>
  Promise.reject(
    new Error(
      `${method} is only supported when the react-native-maps Fabric module is available.`,
    ),
  );

const fallback: Spec = {
  getCamera: unsupported('getCamera'),
  getMarkersFrames: unsupported('getMarkersFrames'),
  getMapBoundaries: unsupported('getMapBoundaries'),
  takeSnapshot: unsupported('takeSnapshot'),
  getAddressFromCoordinates: unsupported('getAddressFromCoordinates'),
  getPointForCoordinate: unsupported('getPointForCoordinate'),
  getCoordinateForPoint: unsupported('getCoordinateForPoint'),
} as unknown as Spec;

const resolvedModule = module ?? fallback;

export default resolvedModule;
