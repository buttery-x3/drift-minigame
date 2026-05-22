import * as THREE from 'three';

export type SurfaceType = 'road' | 'grass' | 'oil';

export interface TrackSample {
  center: THREE.Vector3;
  tangent: THREE.Vector3;
  normal: THREE.Vector3;
  left: THREE.Vector3;
  right: THREE.Vector3;
  width: number;
}

export interface SurfaceZone {
  type: SurfaceType;
  center: THREE.Vector3;
  radius: number;
}

export interface Checkpoint {
  position: THREE.Vector3;
  tangent: THREE.Vector3;
  index: number;
}

export interface TrackData {
  seed: number;
  curve: THREE.CatmullRomCurve3;
  samples: TrackSample[];
  checkpoints: Checkpoint[];
  startPosition: THREE.Vector3;
  startHeading: number;
  roadWidth: number;
  surfaceZones: SurfaceZone[];
}
