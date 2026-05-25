import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';

export class PhysicsWorld {
  world!: RAPIER.World;
  readonly fixedStep = 1 / 60;
  private accumulator = 0;
  private debugLines?: THREE.LineSegments;

  async init() {
    await RAPIER.init();
    this.world = new RAPIER.World({ x: 0, y: 0, z: 0 });
    this.world.integrationParameters.dt = this.fixedStep;
  }

  step(delta: number, onFixedStep?: () => void) {
    let steps = 0;
    this.accumulator += Math.min(delta, 0.1);
    while (this.accumulator >= this.fixedStep) {
      onFixedStep?.();
      this.world.step();
      this.accumulator -= this.fixedStep;
      steps += 1;
    }
    return steps;
  }

  clear() {
    this.accumulator = 0;
    this.world.forEachCollider((collider) => {
      this.world.removeCollider(collider, true);
    });
    this.world.forEachRigidBody((body) => {
      this.world.removeRigidBody(body);
    });
  }

  updateDebug(scene: THREE.Scene) {
    const buffers = this.world.debugRender();
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(buffers.vertices, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(buffers.colors, 4));

    if (!this.debugLines) {
      const material = new THREE.LineBasicMaterial({ vertexColors: true });
      this.debugLines = new THREE.LineSegments(geometry, material);
      scene.add(this.debugLines);
      return;
    }

    this.debugLines.geometry.dispose();
    this.debugLines.geometry = geometry;
  }

  hideDebug(scene: THREE.Scene) {
    if (!this.debugLines) return;
    scene.remove(this.debugLines);
    this.debugLines.geometry.dispose();
    if (Array.isArray(this.debugLines.material)) {
      this.debugLines.material.forEach((material) => material.dispose());
    } else {
      this.debugLines.material.dispose();
    }
    this.debugLines = undefined;
  }
}
