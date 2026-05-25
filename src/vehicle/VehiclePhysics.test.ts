import { describe, expect, it } from 'vitest';
import {
  createVehicleState,
  defaultVehicleSurface,
  defaultVehicleTuning,
  stepVehiclePhysics,
  type VehicleControls,
  type VehicleState,
} from './VehiclePhysics';

const fixedStep = 1 / 60;

function simulate(
  state: VehicleState,
  seconds: number,
  controls: VehicleControls,
  tuning = defaultVehicleTuning,
) {
  let telemetry = stepVehiclePhysics(state, controls, tuning, defaultVehicleSurface, fixedStep);
  for (let i = 1; i < Math.round(seconds / fixedStep); i += 1) {
    telemetry = stepVehiclePhysics(state, controls, tuning, defaultVehicleSurface, fixedStep);
  }
  return telemetry;
}

function kph(metersPerSecond: number) {
  return metersPerSecond * 3.6;
}

describe('VehiclePhysics', () => {
  it('accelerates to a controlled speed after two seconds of throttle', () => {
    const state = createVehicleState();

    const telemetry = simulate(state, 2, { throttle: true, brake: false, steer: 0 });

    expect(kph(telemetry.speed)).toBeGreaterThan(38);
    expect(kph(telemetry.speed)).toBeLessThan(48);
  });

  it('approaches top speed smoothly rather than accelerating without bound', () => {
    const state = createVehicleState();

    const telemetry = simulate(state, 12, { throttle: true, brake: false, steer: 0 });

    expect(kph(telemetry.speed)).toBeGreaterThan(68);
    expect(kph(telemetry.speed)).toBeLessThanOrEqual(defaultVehicleTuning.maxSpeed * 3.6 + 1);
  });

  it('brakes from speed to rest without reversing through zero', () => {
    const state = createVehicleState();
    simulate(state, 5, { throttle: true, brake: false, steer: 0 });

    const telemetry = simulate(state, 3, { throttle: false, brake: true, steer: 0 });

    expect(kph(telemetry.speed)).toBeLessThan(1);
    expect(telemetry.forwardSpeed).toBeGreaterThanOrEqual(0);
  });

  it('only reverses when braking from near-rest', () => {
    const state = createVehicleState();

    const telemetry = simulate(state, 1.5, { throttle: false, brake: true, steer: 0 });

    expect(telemetry.forwardSpeed).toBeLessThan(-2);
    expect(kph(Math.abs(telemetry.forwardSpeed))).toBeLessThan(18);
  });

  it('turning at speed changes heading predictably', () => {
    const state = createVehicleState();
    simulate(state, 2.5, { throttle: true, brake: false, steer: 0 });

    simulate(state, 1, { throttle: true, brake: false, steer: 1 });

    expect(state.yawRate).toBeGreaterThan(0.25);
    expect(state.yawRate).toBeLessThan(1.2);
  });

  it('steering does very little at a standstill', () => {
    const state = createVehicleState();

    simulate(state, 1, { throttle: false, brake: false, steer: 1 });

    expect(Math.abs(state.yawRate)).toBeLessThan(0.01);
  });

  it('does not integrate position or heading because Rapier owns body transforms', () => {
    const state = createVehicleState(0.4);
    const initialHeading = state.heading;

    simulate(state, 2, { throttle: true, brake: false, steer: 1 });

    expect(state.heading).toBe(initialHeading);
  });

  it('low lateral grip surfaces preserve more sideways slip', () => {
    const normal = createVehicleState();
    const slippery = createVehicleState();
    normal.vx = 8;
    slippery.vx = 8;

    stepVehiclePhysics(
      normal,
      { throttle: false, brake: false, steer: 0 },
      defaultVehicleTuning,
      defaultVehicleSurface,
      1,
    );
    stepVehiclePhysics(
      slippery,
      { throttle: false, brake: false, steer: 0 },
      defaultVehicleTuning,
      { ...defaultVehicleSurface, lateralGrip: 0.12 },
      1,
    );

    expect(Math.abs(slippery.vx)).toBeGreaterThan(Math.abs(normal.vx));
  });
});
