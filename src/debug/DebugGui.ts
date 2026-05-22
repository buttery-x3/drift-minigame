import GUI from 'lil-gui';
import type { CameraRig } from '../game/CameraRig';
import type { TrackGenerator } from '../track/TrackGenerator';
import type { VehicleController } from '../vehicle/VehicleController';

export class DebugGui {
  readonly gui = new GUI({ title: 'Tuning' });

  constructor(
    vehicle: VehicleController,
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
    car.add(vehicle.tuning, 'acceleration', 5, 70, 1);
    car.add(vehicle.tuning, 'brake', 2, 45, 1);
    car.add(vehicle.tuning, 'steering', 4, 55, 1);
    car.add(vehicle.tuning, 'lateralGrip', 0.5, 24, 0.1);
    car.add(vehicle.tuning, 'drag', 0, 3, 0.05);
    car.add(vehicle.tuning, 'angularDamping', 0, 9, 0.1);
    car.add(vehicle.tuning, 'maxSpeed', 10, 90, 1);

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
