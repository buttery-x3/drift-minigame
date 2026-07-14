import * as THREE from 'three';
import type { TrackData } from './TrackTypes';

export const WALL_SAMPLE_STEP = 4;
export const WALL_OFFSET = 4.5;
export const WALL_THICKNESS = 0.9;
export const WALL_HEIGHT = 1.1;

export interface TrackBoundarySegment {
  side: 'left' | 'right';
  start: THREE.Vector3;
  end: THREE.Vector3;
  midpoint: THREE.Vector3;
  length: number;
  angle: number;
}

export function createTrackBoundarySegments(track: TrackData): TrackBoundarySegment[] {
  const segments: TrackBoundarySegment[] = [];

  for (const side of ['left', 'right'] as const) {
    for (let i = 0; i < track.samples.length; i += WALL_SAMPLE_STEP) {
      const sample = track.samples[i];
      const next = track.samples[(i + WALL_SAMPLE_STEP) % track.samples.length];
      const sideDirection = side === 'left' ? 1 : -1;
      const start = (side === 'left' ? sample.left : sample.right)
        .clone()
        .addScaledVector(sample.normal, sideDirection * WALL_OFFSET);
      const end = (side === 'left' ? next.left : next.right)
        .clone()
        .addScaledVector(next.normal, sideDirection * WALL_OFFSET);

      segments.push({
        side,
        start,
        end,
        midpoint: new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5),
        length: start.distanceTo(end),
        angle: Math.atan2(end.x - start.x, end.z - start.z),
      });
    }
  }

  return segments;
}
