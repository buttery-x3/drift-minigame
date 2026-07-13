import * as THREE from 'three';

export type SurfaceType = 'road' | 'grass' | 'oil';

export interface TrackGenerationParams {
  seed: number;
  cornerCount: number;
  longStraightCount: 1 | 2;
  minCornerAngleDeg: number;
  maxCornerAngleDeg: number;
  tightCornerRadiusMin: number;
  tightCornerRadiusMax: number;
  wideCornerRadiusMin: number;
  wideCornerRadiusMax: number;
  tightCornerRatio: number;
  normalStraightMinLength: number;
  normalStraightMaxLength: number;
  longStraightMinLength: number;
  longStraightMaxLength: number;
  roadWidth: number;
}

export interface TrackPose {
  position: THREE.Vector2;
  heading: number;
}

export interface StraightTrackSegment {
  type: 'straight';
  start: TrackPose;
  end: TrackPose;
  length: number;
  long: boolean;
}

export interface CornerTrackSegment {
  type: 'corner';
  start: TrackPose;
  end: TrackPose;
  center: THREE.Vector2;
  radius: number;
  sweepRadians: number;
  direction: 'left' | 'right';
  classification: 'tight' | 'wide';
  length: number;
  closing: boolean;
}

export type TrackSegment = StraightTrackSegment | CornerTrackSegment;

export interface TrackSample {
  center: THREE.Vector3;
  tangent: THREE.Vector3;
  normal: THREE.Vector3;
  left: THREE.Vector3;
  right: THREE.Vector3;
  width: number;
  distanceAlongTrack: number;
  sourceSegmentIndex: number;
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
  generationParams: TrackGenerationParams;
  segments: TrackSegment[];
  samples: TrackSample[];
  totalLength: number;
  bounds: THREE.Box3;
  generationAttempts: number;
  checkpoints: Checkpoint[];
  startPosition: THREE.Vector3;
  startHeading: number;
  roadWidth: number;
  surfaceZones: SurfaceZone[];
}
