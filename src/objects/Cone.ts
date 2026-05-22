import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';

export class Cone {
  readonly mesh: THREE.Group;
  readonly body: RAPIER.RigidBody;

  constructor(world: RAPIER.World, position: THREE.Vector3) {
    this.mesh = this.createMesh();
    this.body = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(position.x, 0.55, position.z)
        .setLinearDamping(2.4)
        .setAngularDamping(1.8),
    );
    world.createCollider(RAPIER.ColliderDesc.cone(0.55, 0.36).setDensity(0.25), this.body);
    this.sync();
  }

  sync() {
    const translation = this.body.translation();
    const rotation = this.body.rotation();
    this.mesh.position.set(translation.x, translation.y, translation.z);
    this.mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
  }

  private createMesh() {
    const group = new THREE.Group();
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.42, 1.1, 12),
      new THREE.MeshLambertMaterial({ color: 0xf2762e }),
    );
    cone.position.y = 0;
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(0.34, 0.43, 0.16, 12),
      new THREE.MeshBasicMaterial({ color: 0xf7f1dc }),
    );
    band.position.y = -0.16;
    group.add(cone, band);
    return group;
  }
}
