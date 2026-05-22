import * as THREE from 'three';
import type { TrackData } from '../track/TrackTypes';

export class RaceState {
  lap = 0;
  nextCheckpoint = 0;
  elapsed = 0;
  bestLap = Number.POSITIVE_INFINITY;
  private lapStart = 0;

  constructor(private track: TrackData) {}

  reset(track = this.track) {
    this.track = track;
    this.lap = 0;
    this.nextCheckpoint = 0;
    this.elapsed = 0;
    this.bestLap = Number.POSITIVE_INFINITY;
    this.lapStart = 0;
  }

  update(position: THREE.Vector3, delta: number) {
    this.elapsed += delta;
    const checkpoint = this.track.checkpoints[this.nextCheckpoint];
    if (position.distanceTo(checkpoint.position) > this.track.roadWidth * 0.65) {
      return;
    }

    this.nextCheckpoint += 1;
    if (this.nextCheckpoint >= this.track.checkpoints.length) {
      this.nextCheckpoint = 0;
      this.lap += 1;
      if (this.lap > 0) {
        const lapTime = this.elapsed - this.lapStart;
        this.bestLap = Math.min(this.bestLap, lapTime);
        this.lapStart = this.elapsed;
      }
    }
  }
}
