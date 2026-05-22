import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import type { Input } from '../game/Input';
import type { SurfaceSystem } from '../track/SurfaceSystem';
import { clamp, signedAngleBetween } from '../util/math';

export interface VehicleTuning {
  acceleration: number;
  brake: number;
  steering: number;
  lateralGrip: number;
  drag: number;
  angularDamping: number;
  maxSpeed: number;
}

export class VehicleController {
  readonly body: RAPIER.RigidBody;
  readonly mesh: THREE.Group;
  readonly tuning: VehicleTuning = {
    acceleration: 31,
    brake: 19,
    steering: 24,
    lateralGrip: 8.5,
    drag: 0.45,
    angularDamping: 3.1,
    maxSpeed: 43,
  };

  currentSurface = 'road';
  speed = 0;
  driftAngle = 0;

  constructor(
    private world: RAPIER.World,
    spawn: THREE.Vector3,
    heading: number,
    private surfaces: SurfaceSystem,
  ) {
    this.body = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(spawn.x, 0.55, spawn.z)
        .setRotation(new RAPIER.Quaternion(0, Math.sin(heading / 2), 0, Math.cos(heading / 2)))
        .setLinearDamping(0)
        .setAngularDamping(0)
        .setCanSleep(false)
        .setCcdEnabled(true),
    );
    world.createCollider(RAPIER.ColliderDesc.cuboid(0.86, 0.32, 1.75).setDensity(1), this.body);
    this.mesh = this.createMesh();
    this.sync();
  }

  reset(spawn: THREE.Vector3, heading: number) {
    this.body.setTranslation({ x: spawn.x, y: 0.55, z: spawn.z }, true);
    this.body.setRotation(
      new RAPIER.Quaternion(0, Math.sin(heading / 2), 0, Math.cos(heading / 2)),
      true,
    );
    this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
  }

  fixedUpdate(input: Input, dt: number) {
    const translation = this.body.translation();
    const position = new THREE.Vector3(translation.x, translation.y, translation.z);
    const surface = this.surfaces.profileAt(position);
    this.currentSurface = surface.type;

    const rotation = this.body.rotation();
    const quaternion = new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w);
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(quaternion).normalize();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(quaternion).normalize();
    const velocity = this.body.linvel();
    const v = new THREE.Vector3(velocity.x, 0, velocity.z);
    this.speed = v.length();

    const forwardSpeed = v.dot(forward);
    const lateralSpeed = v.dot(right);
    const throttle = input.isDown('throttle') ? 1 : 0;
    const brake = input.isDown('brake') ? 1 : 0;
    const steer = (input.isDown('left') ? 1 : 0) - (input.isDown('right') ? 1 : 0);
    const speedFactor = clamp(Math.abs(forwardSpeed) / 18, 0.15, 1.3);
    const driftFactor = clamp(Math.abs(lateralSpeed) / 10, 0, 1);

    if (throttle && this.speed < this.tuning.maxSpeed) {
      this.body.addForce(
        {
          x: forward.x * this.tuning.acceleration * surface.acceleration,
          y: 0,
          z: forward.z * this.tuning.acceleration * surface.acceleration,
        },
        true,
      );
    }

    if (brake) {
      this.body.addForce(
        {
          x: -forward.x * this.tuning.brake * Math.sign(forwardSpeed || 1),
          y: 0,
          z: -forward.z * this.tuning.brake * Math.sign(forwardSpeed || 1),
        },
        true,
      );
    }

    if (steer !== 0) {
      this.body.addTorque(
        {
          x: 0,
          y: steer * this.tuning.steering * speedFactor * (1 + driftFactor * 0.35),
          z: 0,
        },
        true,
      );
    }

    const lateralImpulse = -lateralSpeed * this.tuning.lateralGrip * surface.lateralGrip * dt;
    this.body.applyImpulse({ x: right.x * lateralImpulse, y: 0, z: right.z * lateralImpulse }, true);

    const dragImpulse = Math.min(this.speed, this.tuning.drag * surface.drag * this.speed * dt);
    if (this.speed > 0.001) {
      const drag = v.normalize().multiplyScalar(-dragImpulse);
      this.body.applyImpulse({ x: drag.x, y: 0, z: drag.z }, true);
    }

    const angvel = this.body.angvel();
    const dampedY =
      angvel.y * Math.max(0, 1 - this.tuning.angularDamping * surface.angularDamping * dt);
    this.body.setAngvel({ x: 0, y: dampedY, z: 0 }, true);
    this.body.setTranslation({ x: translation.x, y: 0.55, z: translation.z }, true);

    this.driftAngle = this.speed > 1 ? signedAngleBetween(forward, v.clone().normalize()) : 0;
  }

  sync() {
    const translation = this.body.translation();
    const rotation = this.body.rotation();
    this.mesh.position.set(translation.x, translation.y, translation.z);
    this.mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
  }

  private createMesh() {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 0.55, 3.35),
      new THREE.MeshLambertMaterial({ color: 0x69b6ff }),
    );
    body.position.y = 0;
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.45, 1.15),
      new THREE.MeshLambertMaterial({ color: 0x20313a }),
    );
    cabin.position.set(0, 0.42, -0.2);
    const nose = new THREE.Mesh(
      new THREE.BoxGeometry(1.35, 0.16, 0.16),
      new THREE.MeshBasicMaterial({ color: 0xf2f0df }),
    );
    nose.position.set(0, 0.05, 1.73);
    group.add(body, cabin, nose);
    return group;
  }
}
