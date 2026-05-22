import * as THREE from 'three';
import { lerp } from '../util/math';
import type { VehicleController } from '../vehicle/VehicleController';

type CameraMode = 'highChase' | 'topDown' | 'closeChase';

const modes: Record<CameraMode, { distance: number; height: number; lookAhead: number }> = {
  highChase: { distance: 23, height: 22, lookAhead: 10 },
  topDown: { distance: 0.1, height: 58, lookAhead: 3 },
  closeChase: { distance: 12, height: 6, lookAhead: 8 },
};

export class CameraRig {
  private mode: CameraMode = 'highChase';
  private target = new THREE.Vector3();

  constructor(private camera: THREE.PerspectiveCamera) {}

  cycleMode() {
    this.mode =
      this.mode === 'highChase' ? 'closeChase' : this.mode === 'closeChase' ? 'topDown' : 'highChase';
  }

  update(vehicle: VehicleController, delta: number) {
    const config = modes[this.mode];
    const carPosition = vehicle.mesh.position;
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(vehicle.mesh.quaternion).normalize();
    const desired = carPosition
      .clone()
      .addScaledVector(forward, -config.distance)
      .add(new THREE.Vector3(0, config.height, 0));
    const stiffness = 1 - Math.exp(-delta * 4.8);
    this.camera.position.lerp(desired, stiffness);
    this.target.lerp(
      carPosition.clone().addScaledVector(forward, config.lookAhead).add(new THREE.Vector3(0, 1, 0)),
      1 - Math.exp(-delta * 6.5),
    );
    this.camera.lookAt(this.target);
    this.camera.fov = lerp(this.camera.fov, this.mode === 'closeChase' ? 58 : 50, stiffness);
    this.camera.updateProjectionMatrix();
  }
}
