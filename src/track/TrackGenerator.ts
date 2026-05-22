import * as THREE from 'three';
import { seededRandom } from '../util/math';
import type { TrackData, TrackSample } from './TrackTypes';

const up = new THREE.Vector3(0, 1, 0);

export class TrackGenerator {
  generate(seed = Math.floor(Math.random() * 1_000_000)): TrackData {
    const random = seededRandom(seed);
    const points = this.generateControlPoints(random);
    const curve = new THREE.CatmullRomCurve3(points, true, 'centripetal', 0.45);
    const roadWidth = 18;
    const samples = this.sampleCurve(curve, roadWidth, 240);
    const checkpoints = [0.18, 0.36, 0.54, 0.72, 0.9].map((t, index) => {
      const sample = samples[Math.floor(t * samples.length) % samples.length];
      return {
        position: sample.center.clone(),
        tangent: sample.tangent.clone(),
        index,
      };
    });
    const start = samples[0];
    const startPosition = start.center.clone().addScaledVector(start.tangent, -8);
    const startHeading = Math.atan2(start.tangent.x, start.tangent.z);
    const surfaceZones = [0.26, 0.61].map((t, index) => {
      const sample = samples[Math.floor(t * samples.length) % samples.length];
      return {
        type: 'oil' as const,
        center: sample.center
          .clone()
          .addScaledVector(sample.normal, index === 0 ? -3 : 3),
        radius: 9,
      };
    });

    return {
      seed,
      curve,
      samples,
      checkpoints,
      startPosition,
      startHeading,
      roadWidth,
      surfaceZones,
    };
  }

  private generateControlPoints(random: () => number) {
    const count = 14 + Math.floor(random() * 5);
    const points: THREE.Vector3[] = [];

    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2;
      const radius = 62 + random() * 40;
      const wobble = Math.sin(angle * 3 + random() * Math.PI) * 12;
      points.push(
        new THREE.Vector3(
          Math.cos(angle) * (radius + wobble),
          0,
          Math.sin(angle) * (radius - wobble * 0.45),
        ),
      );
    }

    return points;
  }

  private sampleCurve(
    curve: THREE.CatmullRomCurve3,
    roadWidth: number,
    segments: number,
  ): TrackSample[] {
    const samples: TrackSample[] = [];

    for (let i = 0; i < segments; i += 1) {
      const t = i / segments;
      const center = curve.getPointAt(t);
      const next = curve.getPointAt((i + 1) / segments);
      const tangent = next.sub(center).normalize();
      const normal = new THREE.Vector3().crossVectors(up, tangent).normalize();
      samples.push({
        center,
        tangent,
        normal,
        left: center.clone().addScaledVector(normal, roadWidth / 2),
        right: center.clone().addScaledVector(normal, -roadWidth / 2),
        width: roadWidth,
      });
    }

    return samples;
  }
}
