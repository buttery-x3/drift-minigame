import * as THREE from 'three';
import type { SurfaceType, TrackData } from './TrackTypes';

export interface SurfaceProfile {
  type: SurfaceType;
  acceleration: number;
  drag: number;
  lateralGrip: number;
  angularDamping: number;
}

const profiles: Record<SurfaceType, SurfaceProfile> = {
  road: {
    type: 'road',
    acceleration: 1,
    drag: 1,
    lateralGrip: 1,
    angularDamping: 1,
  },
  grass: {
    type: 'grass',
    acceleration: 0.45,
    drag: 2.8,
    lateralGrip: 0.55,
    angularDamping: 1.3,
  },
  oil: {
    type: 'oil',
    acceleration: 0.75,
    drag: 0.6,
    lateralGrip: 0.12,
    angularDamping: 0.15,
  },
};

export class SurfaceSystem {
  constructor(private track: TrackData) {}

  profileAt(position: THREE.Vector3) {
    for (const zone of this.track.surfaceZones) {
      if (position.distanceTo(zone.center) <= zone.radius) {
        return profiles[zone.type];
      }
    }

    return this.isOnRoad(position) ? profiles.road : profiles.grass;
  }

  isOnRoad(position: THREE.Vector3) {
    let closestDistance = Number.POSITIVE_INFINITY;
    for (const sample of this.track.samples) {
      const distance = sample.center.distanceTo(position);
      closestDistance = Math.min(closestDistance, distance);
    }
    return closestDistance <= this.track.roadWidth * 0.56;
  }
}
