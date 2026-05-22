import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { DebugGui } from '../debug/DebugGui';
import { Cone } from '../objects/Cone';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { RaceState } from '../race/RaceState';
import { SurfaceSystem } from '../track/SurfaceSystem';
import { TrackColliders } from '../track/TrackColliders';
import { TrackGenerator } from '../track/TrackGenerator';
import { TrackMesh } from '../track/TrackMesh';
import type { TrackData } from '../track/TrackTypes';
import { VehicleController, type VehicleTuning } from '../vehicle/VehicleController';
import { CameraRig } from './CameraRig';
import { Input } from './Input';

export class Game {
  private renderer!: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(50, 1, 0.1, 800);
  private cameraRig = new CameraRig(this.camera);
  private clock = new THREE.Clock();
  private physics = new PhysicsWorld();
  private input = new Input();
  private trackGenerator = new TrackGenerator();
  private track!: TrackData;
  private trackMesh?: TrackMesh;
  private surfaces!: SurfaceSystem;
  private vehicle!: VehicleController;
  private cones: Cone[] = [];
  private race!: RaceState;
  private debugGui?: DebugGui;
  private hud!: HTMLDivElement;
  private physicsDebug = false;
  private readonly vehicleTuning: VehicleTuning = {
    acceleration: 13,
    brake: 12,
    steering: 13,
    lateralGrip: 6.8,
    drag: 0.9,
    angularDamping: 4.2,
    maxSpeed: 28,
  };

  constructor(private root: HTMLElement) {}

  async init() {
    await this.physics.init();
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x9fc2cc);
    this.renderer.shadowMap.enabled = true;
    this.root.append(this.renderer.domElement);

    this.scene.fog = new THREE.Fog(0x9fc2cc, 150, 370);
    this.addLights();
    this.createHud();
    this.buildWorld();
    this.debugGui = new DebugGui(
      this.vehicleTuning,
      {
        regenerate: () => this.buildWorld(),
        reset: () => this.resetVehicle(),
        cycleCamera: () => this.cameraRig.cycleMode(),
        togglePhysicsDebug: () => {
          this.physicsDebug = !this.physicsDebug;
          if (!this.physicsDebug) {
            this.physics.hideDebug(this.scene);
          }
        },
      },
      this.cameraRig,
      this.trackGenerator,
    );

    window.addEventListener('resize', this.onResize);
    this.onResize();
  }

  start() {
    this.clock.start();
    this.renderer.setAnimationLoop(this.animate);
  }

  private buildWorld(seed?: number) {
    this.physics.hideDebug(this.scene);
    this.physics.clear();
    this.clearSceneObjects();
    this.track = this.trackGenerator.generate(seed);
    this.surfaces = new SurfaceSystem(this.track);
    this.trackMesh = new TrackMesh(this.track);
    this.scene.add(this.trackMesh.group);
    new TrackColliders(this.physics.world, this.track).create();
    this.vehicle = new VehicleController(
      this.physics.world,
      this.track.startPosition,
      this.track.startHeading,
      this.surfaces,
      this.vehicleTuning,
    );
    this.scene.add(this.vehicle.mesh);
    this.spawnCones();
    this.race = new RaceState(this.track);
  }

  private clearSceneObjects() {
    if (this.trackMesh) {
      this.scene.remove(this.trackMesh.group);
      this.trackMesh.dispose();
    }
    if (this.vehicle) {
      this.scene.remove(this.vehicle.mesh);
    }
    for (const cone of this.cones) {
      this.scene.remove(cone.mesh);
    }
    this.cones = [];
  }

  private spawnCones() {
    for (let i = 0; i < this.track.samples.length; i += 12) {
      const sample = this.track.samples[i];
      const side = i % 24 === 0 ? 1 : -1;
      const position = sample.center
        .clone()
        .addScaledVector(sample.normal, side * (this.track.roadWidth / 2 + 1.4));
      const cone = new Cone(this.physics.world, position);
      this.cones.push(cone);
      this.scene.add(cone.mesh);
    }
  }

  private animate = () => {
    const delta = this.clock.getDelta();

    if (this.input.wasPressed('reset')) {
      this.resetVehicle();
    }
    if (this.input.wasPressed('regenerate')) {
      this.buildWorld();
    }
    if (this.input.wasPressed('camera')) {
      this.cameraRig.cycleMode();
    }

    this.physics.step(delta, () => this.vehicle.fixedUpdate(this.input, this.physics.fixedStep));
    this.vehicle.sync();
    for (const cone of this.cones) {
      cone.sync();
    }
    this.race.update(this.vehicle.mesh.position, delta);
    this.cameraRig.update(this.vehicle, delta);
    this.updateHud();
    if (this.physicsDebug) {
      this.physics.updateDebug(this.scene);
    }
    this.renderer.render(this.scene, this.camera);
    this.input.endFrame();
  };

  private resetVehicle() {
    this.input.clear();
    this.vehicle.reset(this.track.startPosition, this.track.startHeading);
  }

  private addLights() {
    const hemi = new THREE.HemisphereLight(0xf8f1df, 0x31553a, 1.7);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffffff, 2.1);
    sun.position.set(-80, 120, 50);
    this.scene.add(sun);
  }

  private createHud() {
    this.hud = document.createElement('div');
    this.hud.className = 'hud';
    this.root.append(this.hud);

    const hint = document.createElement('div');
    hint.className = 'hint';
    hint.textContent =
      'WASD / arrows drive. R resets. T generates a new circuit. C cycles camera. Use the tuning panel to shape the drift feel.';
    this.root.append(hint);
  }

  private updateHud() {
    const best = Number.isFinite(this.race.bestLap) ? `${this.race.bestLap.toFixed(2)}s` : '--';
    this.hud.innerHTML = `
      <div><strong>Seed</strong> ${this.track.seed}</div>
      <div><strong>Speed</strong> ${(this.vehicle.speed * 3.6).toFixed(0)} km/h</div>
      <div><strong>Surface</strong> ${this.vehicle.currentSurface}</div>
      <div><strong>Drift</strong> ${Math.abs((this.vehicle.driftAngle * 180) / Math.PI).toFixed(0)} deg</div>
      <div><strong>Lap</strong> ${this.race.lap}</div>
      <div><strong>Next</strong> ${this.race.nextCheckpoint + 1}/${this.track.checkpoints.length}</div>
      <div><strong>Best</strong> ${best}</div>
    `;
  }

  private onResize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };
}
