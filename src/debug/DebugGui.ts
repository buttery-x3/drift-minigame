import GUI from 'lil-gui';
import type { CameraRig } from '../game/CameraRig';
import type { TrackGenerator } from '../track/TrackGenerator';
import type { VehicleTuning } from '../vehicle/VehicleController';

export class DebugGui {
  readonly gui = new GUI({ title: 'Tuning' });

  constructor(
    vehicleTuning: VehicleTuning,
    actions: {
      regenerate: () => void;
      reset: () => void;
      cycleCamera: () => void;
      togglePhysicsDebug: () => void;
    },
    _cameraRig: CameraRig,
    _trackGenerator: TrackGenerator,
    onTuningChange: () => void,
  ) {
    const car = this.gui.addFolder('Car');
    car.add(vehicleTuning, 'acceleration', 2, 16, 0.25).onChange(onTuningChange);
    car.add(vehicleTuning, 'brake', 4, 24, 0.25).onChange(onTuningChange);
    car.add(vehicleTuning, 'reverseAcceleration', 1, 8, 0.25).onChange(onTuningChange);
    car.add(vehicleTuning, 'steering', 0.5, 4, 0.05).onChange(onTuningChange);
    car.add(vehicleTuning, 'lateralGrip', 0.5, 10, 0.1).onChange(onTuningChange);
    car.add(vehicleTuning, 'drag', 0, 1.5, 0.01).onChange(onTuningChange);
    car.add(vehicleTuning, 'angularDamping', 0, 10, 0.1).onChange(onTuningChange);
    car.add(vehicleTuning, 'maxSpeed', 8, 40, 0.5).onChange(onTuningChange);

    const controls = this.gui.addFolder('Actions');
    controls.add(actions, 'reset').name('Reset car');
    controls.add(actions, 'regenerate').name('New track');
    controls.add(actions, 'cycleCamera').name('Camera mode');
    controls.add(actions, 'togglePhysicsDebug').name('Physics debug');
  }

  dispose() {
    this.gui.destroy();
  }
}
