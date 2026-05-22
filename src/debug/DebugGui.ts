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
  ) {
    const car = this.gui.addFolder('Car');
    car.add(vehicleTuning, 'acceleration', 2, 45, 1);
    car.add(vehicleTuning, 'brake', 2, 35, 1);
    car.add(vehicleTuning, 'steering', 2, 35, 1);
    car.add(vehicleTuning, 'lateralGrip', 0.5, 20, 0.1);
    car.add(vehicleTuning, 'drag', 0, 4, 0.05);
    car.add(vehicleTuning, 'angularDamping', 0, 10, 0.1);
    car.add(vehicleTuning, 'maxSpeed', 8, 70, 1);

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
