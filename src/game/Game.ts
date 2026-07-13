import * as THREE from 'three';
import { DebugGui } from '../debug/DebugGui';
import { Cone } from '../objects/Cone';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { RaceState } from '../race/RaceState';
import { SurfaceSystem } from '../track/SurfaceSystem';
import { TrackColliders } from '../track/TrackColliders';
import {
  TrackGenerationError,
  TrackGenerator,
  defaultTrackGenerationParams,
} from '../track/TrackGenerator';
import { TrackGeneratorPanel } from '../track/TrackGeneratorPanel';
import { TrackMesh } from '../track/TrackMesh';
import type { TrackData, TrackGenerationParams } from '../track/TrackTypes';
import { VehicleController, type VehicleTuning } from '../vehicle/VehicleController';
import { loadVehicleTuning, saveVehicleTuning } from '../vehicle/VehicleTuningStorage';
import { CameraRig } from './CameraRig';
import { Input } from './Input';

type GameMode = 'generator' | 'race';

export class Game {
  private renderer!: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private raceCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 800);
  private previewCamera = new THREE.OrthographicCamera(-100, 100, 100, -100, 0.1, 600);
  private cameraRig = new CameraRig(this.raceCamera);
  private clock = new THREE.Clock();
  private physics = new PhysicsWorld();
  private input = new Input();
  private trackGenerator = new TrackGenerator();
  private generationParams: TrackGenerationParams = { ...defaultTrackGenerationParams };
  private mode: GameMode = 'generator';
  private track?: TrackData;
  private trackMesh?: TrackMesh;
  private surfaces?: SurfaceSystem;
  private vehicle?: VehicleController;
  private cones: Cone[] = [];
  private race?: RaceState;
  private debugGui?: DebugGui;
  private generatorPanel!: TrackGeneratorPanel;
  private hud!: HTMLDivElement;
  private hint!: HTMLDivElement;
  private physicsDebug = false;
  private readonly vehicleTuning: VehicleTuning = loadVehicleTuning();
  private readonly raceFog = new THREE.Fog(0x9fc2cc, 150, 370);

  constructor(private root: HTMLElement) {}

  async init() {
    await this.physics.init();
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x9fc2cc);
    this.renderer.shadowMap.enabled = true;
    this.root.append(this.renderer.domElement);

    this.addLights();
    this.createHud();
    this.debugGui = new DebugGui(
      this.vehicleTuning,
      {
        regenerate: () => this.enterGeneratorMode(),
        reset: () => this.resetVehicle(),
        cycleCamera: () => this.cameraRig.cycleMode(),
        togglePhysicsDebug: () => {
          this.physicsDebug = !this.physicsDebug;
          if (!this.physicsDebug) this.physics.hideDebug(this.scene);
        },
      },
      () => saveVehicleTuning(this.vehicleTuning),
    );
    this.generatorPanel = new TrackGeneratorPanel(
      this.root,
      this.generationParams,
      (params) => this.generatePreview(params),
      () => this.enterRaceMode(),
    );

    this.generatePreview(this.generationParams);
    window.addEventListener('resize', this.onResize);
    this.onResize();
  }

  start() {
    this.clock.start();
    this.renderer.setAnimationLoop(this.animate);
  }

  private generatePreview(params: TrackGenerationParams) {
    try {
      const track = this.trackGenerator.generate(params);
      this.generationParams = { ...track.generationParams };
      this.track = track;
      this.mode = 'generator';
      this.physics.hideDebug(this.scene);
      this.physics.clear();
      this.clearSceneObjects();
      this.scene.fog = null;
      this.trackMesh = new TrackMesh(track, { mode: 'preview', showSegmentOverlay: true });
      this.scene.add(this.trackMesh.group);
      this.fitPreviewCamera();
      this.generatorPanel.setTrack(track);
      this.generatorPanel.setVisible(true);
      this.debugGui?.setVisible(false);
      this.hud.hidden = true;
      this.hint.textContent = 'T generates the next seed. Enter races this circuit.';
    } catch (error) {
      const message =
        error instanceof TrackGenerationError ? error.message : 'Unexpected track generation error.';
      this.generatorPanel.setError(message);
    }
  }

  private enterGeneratorMode() {
    if (!this.track) {
      this.generatePreview(this.generationParams);
      return;
    }
    this.mode = 'generator';
    this.physics.hideDebug(this.scene);
    this.physics.clear();
    this.clearSceneObjects();
    this.scene.fog = null;
    this.trackMesh = new TrackMesh(this.track, { mode: 'preview', showSegmentOverlay: true });
    this.scene.add(this.trackMesh.group);
    this.fitPreviewCamera();
    this.generatorPanel.setTrack(this.track);
    this.generatorPanel.setVisible(true);
    this.debugGui?.setVisible(false);
    this.hud.hidden = true;
    this.hint.textContent = 'T generates the next seed. Enter races this circuit.';
  }

  private enterRaceMode() {
    if (!this.track) return;
    this.mode = 'race';
    this.physics.clear();
    this.clearSceneObjects();
    this.scene.fog = this.raceFog;
    this.trackMesh = new TrackMesh(this.track, { mode: 'race' });
    this.scene.add(this.trackMesh.group);
    this.surfaces = new SurfaceSystem(this.track);
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
    this.generatorPanel.setVisible(false);
    this.debugGui?.setVisible(true);
    this.hud.hidden = false;
    this.hint.textContent =
      'WASD / arrows drive. R resets. C cycles camera. T or Escape returns to the generator.';
    this.cameraRig.update(this.vehicle, 1);
  }

  private clearSceneObjects() {
    if (this.trackMesh) {
      this.scene.remove(this.trackMesh.group);
      this.trackMesh.dispose();
      this.trackMesh = undefined;
    }
    if (this.vehicle) {
      this.scene.remove(this.vehicle.mesh);
      this.vehicle = undefined;
    }
    for (const cone of this.cones) this.scene.remove(cone.mesh);
    this.cones = [];
    this.surfaces = undefined;
    this.race = undefined;
  }

  private spawnCones() {
    if (!this.track) return;
    let nextDistance = 0;
    for (const sample of this.track.samples) {
      if (sample.distanceAlongTrack < nextDistance) continue;
      const side = Math.floor(nextDistance / 24) % 2 === 0 ? 1 : -1;
      const position = sample.center
        .clone()
        .addScaledVector(sample.normal, side * (this.track.roadWidth / 2 + 1.4));
      const cone = new Cone(this.physics.world, position);
      this.cones.push(cone);
      this.scene.add(cone.mesh);
      nextDistance += 24;
    }
  }

  private animate = () => {
    const delta = this.clock.getDelta();

    if (this.mode === 'generator') {
      if (this.input.wasPressed('regenerate')) {
        this.generatorPanel.setSeedAndSubmit(this.generationParams.seed + 1);
      }
      if (this.input.wasPressed('confirm')) this.enterRaceMode();
      this.renderer.render(this.scene, this.previewCamera);
      this.input.endFrame();
      return;
    }

    if (this.input.wasPressed('reset')) this.resetVehicle();
    if (this.input.wasPressed('regenerate') || this.input.wasPressed('back')) {
      this.enterGeneratorMode();
      this.input.endFrame();
      return;
    }
    if (this.input.wasPressed('camera')) this.cameraRig.cycleMode();

    if (this.vehicle && this.race) {
      const physicsSteps = this.physics.step(delta, () =>
        this.vehicle?.fixedUpdate(this.input, this.physics.fixedStep),
      );
      this.vehicle.sync();
      for (const cone of this.cones) cone.sync();
      this.race.update(this.vehicle.mesh.position, delta);
      if (physicsSteps > 0) {
        this.cameraRig.update(this.vehicle, this.physics.fixedStep * physicsSteps);
      }
      this.updateHud();
    }
    if (this.physicsDebug) this.physics.updateDebug(this.scene);
    this.renderer.render(this.scene, this.raceCamera);
    this.input.endFrame();
  };

  private resetVehicle() {
    if (!this.vehicle || !this.track) return;
    this.input.clear();
    this.vehicle.reset(this.track.startPosition, this.track.startHeading);
  }

  private fitPreviewCamera() {
    if (!this.track) return;
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    this.track.bounds.getSize(size);
    this.track.bounds.getCenter(center);
    const panelAllowance = Math.min(420, window.innerWidth * 0.32);
    const usableWidth = Math.max(320, window.innerWidth - panelAllowance);
    const paddedWidth = size.x + 44;
    const paddedHeight = size.z + 44;
    const pixelsPerUnit = Math.min(
      usableWidth / paddedWidth,
      window.innerHeight / paddedHeight,
    );
    const halfWidth = window.innerWidth / pixelsPerUnit / 2;
    const halfHeight = window.innerHeight / pixelsPerUnit / 2;
    const desiredCenterNdc = panelAllowance / window.innerWidth;

    this.previewCamera.left = -halfWidth;
    this.previewCamera.right = halfWidth;
    this.previewCamera.top = halfHeight;
    this.previewCamera.bottom = -halfHeight;
    this.previewCamera.position.set(center.x - desiredCenterNdc * halfWidth, 250, center.z);
    this.previewCamera.up.set(0, 0, -1);
    this.previewCamera.lookAt(this.previewCamera.position.x, 0, center.z);
    this.previewCamera.updateProjectionMatrix();
  }

  private addLights() {
    this.scene.add(new THREE.HemisphereLight(0xf8f1df, 0x31553a, 1.7));
    const sun = new THREE.DirectionalLight(0xffffff, 2.1);
    sun.position.set(-80, 120, 50);
    this.scene.add(sun);
  }

  private createHud() {
    this.hud = document.createElement('div');
    this.hud.className = 'hud';
    this.root.append(this.hud);
    this.hint = document.createElement('div');
    this.hint.className = 'hint';
    this.root.append(this.hint);
  }

  private updateHud() {
    if (!this.track || !this.vehicle || !this.race) return;
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
    this.raceCamera.aspect = width / height;
    this.raceCamera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    if (this.mode === 'generator') this.fitPreviewCamera();
  };
}
