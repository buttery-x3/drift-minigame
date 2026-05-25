import { clamp } from '../util/math';

export interface VehicleTuning {
  acceleration: number;
  brake: number;
  reverseAcceleration: number;
  steering: number;
  lateralGrip: number;
  drag: number;
  angularDamping: number;
  maxSpeed: number;
}

export interface VehicleControls {
  throttle: boolean;
  brake: boolean;
  steer: number;
}

export interface VehicleSurface {
  acceleration: number;
  drag: number;
  lateralGrip: number;
  angularDamping: number;
}

export interface VehicleState {
  x: number;
  z: number;
  heading: number;
  vx: number;
  vz: number;
  yawRate: number;
  brakeWasPressed: boolean;
  brakeStartedNearRest: boolean;
}

export interface VehicleTelemetry {
  speed: number;
  forwardSpeed: number;
  lateralSpeed: number;
  driftAngle: number;
}

export const defaultVehicleTuning: VehicleTuning = {
  acceleration: 7.4,
  brake: 12,
  reverseAcceleration: 3,
  steering: 1.95,
  lateralGrip: 3.8,
  drag: 0.16,
  angularDamping: 5.2,
  maxSpeed: 24,
};

export const defaultVehicleSurface: VehicleSurface = {
  acceleration: 1,
  drag: 1,
  lateralGrip: 1,
  angularDamping: 1,
};

export function createVehicleState(x = 0, z = 0, heading = 0): VehicleState {
  return {
    x,
    z,
    heading,
    vx: 0,
    vz: 0,
    yawRate: 0,
    brakeWasPressed: false,
    brakeStartedNearRest: false,
  };
}

export function stepVehiclePhysics(
  state: VehicleState,
  controls: VehicleControls,
  tuning: VehicleTuning,
  surface: VehicleSurface,
  dt: number,
): VehicleTelemetry {
  const forwardX = Math.sin(state.heading);
  const forwardZ = Math.cos(state.heading);
  const rightX = Math.cos(state.heading);
  const rightZ = -Math.sin(state.heading);

  let forwardSpeed = state.vx * forwardX + state.vz * forwardZ;
  let lateralSpeed = state.vx * rightX + state.vz * rightZ;
  const initialSpeed = Math.hypot(forwardSpeed, lateralSpeed);

  if (controls.brake && !state.brakeWasPressed) {
    state.brakeStartedNearRest = initialSpeed < 0.5;
  } else if (!controls.brake) {
    state.brakeStartedNearRest = false;
  }
  state.brakeWasPressed = controls.brake;

  if (controls.throttle && forwardSpeed < tuning.maxSpeed) {
    const speedRatio = clamp(Math.max(forwardSpeed, 0) / tuning.maxSpeed, 0, 1);
    const accelerationCurve = 1 - speedRatio * 0.55;
    forwardSpeed += tuning.acceleration * surface.acceleration * accelerationCurve * dt;
  }

  if (controls.brake) {
    if (forwardSpeed > 0.15) {
      forwardSpeed = Math.max(0, forwardSpeed - tuning.brake * dt);
    } else if (state.brakeStartedNearRest) {
      forwardSpeed -= tuning.reverseAcceleration * surface.acceleration * dt;
      forwardSpeed = Math.max(forwardSpeed, -tuning.maxSpeed * 0.32);
    } else {
      forwardSpeed = 0;
    }
  }

  const naturalDrag = Math.max(0, 1 - tuning.drag * surface.drag * dt);
  forwardSpeed *= naturalDrag;

  const grip = clamp(tuning.lateralGrip * surface.lateralGrip * dt, 0, 1);
  lateralSpeed *= 1 - grip;

  const speed = Math.hypot(forwardSpeed, lateralSpeed);
  const steeringSpeedFactor = clamp(speed / 12, 0, 1);
  const driftAssist = clamp(Math.abs(lateralSpeed) / 8, 0, 0.45);
  const targetYawRate =
    controls.steer * tuning.steering * steeringSpeedFactor * (1 + driftAssist);
  const yawResponse = clamp((4.5 + speed * 0.08) * dt, 0, 1);
  state.yawRate += (targetYawRate - state.yawRate) * yawResponse;
  state.yawRate *= Math.max(0, 1 - tuning.angularDamping * surface.angularDamping * dt);

  state.heading += state.yawRate * dt;
  state.vx = forwardX * forwardSpeed + rightX * lateralSpeed;
  state.vz = forwardZ * forwardSpeed + rightZ * lateralSpeed;
  state.x += state.vx * dt;
  state.z += state.vz * dt;

  const driftAngle =
    speed > 0.5 ? Math.atan2(lateralSpeed, Math.max(Math.abs(forwardSpeed), 0.001)) : 0;

  return {
    speed,
    forwardSpeed,
    lateralSpeed,
    driftAngle,
  };
}
