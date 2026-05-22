import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import type { Input } from '../game/Input';
import type { SurfaceSystem } from '../track/SurfaceSystem';
import {
  createVehicleState,
  stepVehiclePhysics,
  type VehicleState,
  type VehicleTelemetry,
  type VehicleTuning,
} from './VehiclePhysics';

export type { VehicleTuning } from './VehiclePhysics';

export class VehicleController {
  readonly body: RAPIER.RigidBody;
  readonly mesh: THREE.Group;
  private model: VehicleState;
  private telemetry: VehicleTelemetry = {
    speed: 0,
    forwardSpeed: 0,
    lateralSpeed: 0,
    driftAngle: 0,
  };

  currentSurface = 'road';
  speed = 0;
  driftAngle = 0;

  constructor(
    private world: RAPIER.World,
    spawn: THREE.Vector3,
    heading: number,
    private surfaces: SurfaceSystem,
    readonly tuning: VehicleTuning,
  ) {
    this.model = createVehicleState(heading);
    this.body = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(spawn.x, 0.55, spawn.z)
        .setRotation(new RAPIER.Quaternion(0, Math.sin(heading / 2), 0, Math.cos(heading / 2)))
        .setLinearDamping(0)
        .setAngularDamping(0)
        .setCanSleep(false)
        .setCcdEnabled(true),
    );
    this.body.setEnabledTranslations(true, false, true, true);
    this.body.setEnabledRotations(false, true, false, true);
    world.createCollider(RAPIER.ColliderDesc.cuboid(0.86, 0.32, 1.75).setDensity(1), this.body);
    this.mesh = this.createMesh();
    this.sync();
  }

  reset(spawn: THREE.Vector3, heading: number) {
    this.body.resetForces(true);
    this.body.resetTorques(true);
    this.body.setTranslation({ x: spawn.x, y: 0.55, z: spawn.z }, true);
    this.body.setRotation(
      new RAPIER.Quaternion(0, Math.sin(heading / 2), 0, Math.cos(heading / 2)),
      true,
    );
    this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    this.speed = 0;
    this.driftAngle = 0;
    this.currentSurface = 'road';
    this.model = createVehicleState(heading);
    this.telemetry = {
      speed: 0,
      forwardSpeed: 0,
      lateralSpeed: 0,
      driftAngle: 0,
    };
    this.sync();
  }

  fixedUpdate(input: Input, dt: number) {
    const translation = this.body.translation();
    const position = new THREE.Vector3(translation.x, translation.y, translation.z);
    const surface = this.surfaces.profileAt(position);
    this.currentSurface = surface.type;

    const rotation = this.body.rotation();
    const quaternion = new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w);
    const velocity = this.body.linvel();

    this.model.heading = new THREE.Euler().setFromQuaternion(quaternion, 'YXZ').y;
    this.model.vx = velocity.x;
    this.model.vz = velocity.z;
    this.model.yawRate = this.body.angvel().y;

    this.body.resetForces(true);
    this.body.resetTorques(true);
    this.telemetry = stepVehiclePhysics(
      this.model,
      {
        throttle: input.isDown('throttle'),
        brake: input.isDown('brake'),
        steer: (input.isDown('left') ? 1 : 0) - (input.isDown('right') ? 1 : 0),
      },
      this.tuning,
      surface,
      dt,
    );

    this.body.setLinvel({ x: this.model.vx, y: 0, z: this.model.vz }, true);
    this.body.setAngvel({ x: 0, y: this.model.yawRate, z: 0 }, true);

    this.speed = this.telemetry.speed;
    this.driftAngle = this.telemetry.driftAngle;
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
