import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import type { TrackData } from './TrackTypes';

export class TrackColliders {
  constructor(
    private world: RAPIER.World,
    private track: TrackData,
  ) {}

  create() {
    this.createBoundarySegments('left');
    this.createBoundarySegments('right');
  }

  private createBoundarySegments(side: 'left' | 'right') {
    for (let i = 0; i < this.track.samples.length; i += 4) {
      const sample = this.track.samples[i];
      const next = this.track.samples[(i + 4) % this.track.samples.length];
      const a = side === 'left' ? sample.left : sample.right;
      const b = side === 'left' ? next.left : next.right;
      this.createWallSegment(a, b);
    }
  }

  private createWallSegment(a: THREE.Vector3, b: THREE.Vector3) {
    const midpoint = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
    const length = a.distanceTo(b);
    const angle = Math.atan2(b.x - a.x, b.z - a.z);
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(midpoint.x, 0.55, midpoint.z),
    );
    body.setRotation(
      new RAPIER.Quaternion(0, Math.sin(angle / 2), 0, Math.cos(angle / 2)),
      true,
    );
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(0.45, 0.55, length / 2), body);
  }
}
