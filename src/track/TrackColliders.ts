import RAPIER from '@dimforge/rapier3d-compat';
import type { TrackData } from './TrackTypes';
import {
  WALL_HEIGHT,
  WALL_THICKNESS,
  createTrackBoundarySegments,
  type TrackBoundarySegment,
} from './TrackBoundaries';

export class TrackColliders {
  constructor(
    private world: RAPIER.World,
    private track: TrackData,
  ) {}

  create() {
    for (const segment of createTrackBoundarySegments(this.track)) {
      this.createWallSegment(segment);
    }
  }

  private createWallSegment(segment: TrackBoundarySegment) {
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(
        segment.midpoint.x,
        WALL_HEIGHT / 2,
        segment.midpoint.z,
      ),
    );
    body.setRotation(
      new RAPIER.Quaternion(
        0,
        Math.sin(segment.angle / 2),
        0,
        Math.cos(segment.angle / 2),
      ),
      true,
    );
    this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(WALL_THICKNESS / 2, WALL_HEIGHT / 2, segment.length / 2),
      body,
    );
  }
}
