import * as THREE from 'three';
import { seededRandom } from '../util/math';
import {
  createBiarc,
  createCorner,
  createStraight,
  forwardFromHeading,
  normalFromHeading,
  wrapAngle,
} from './TrackGeometry';
import type {
  CornerTrackSegment,
  TrackData,
  TrackGenerationParams,
  TrackPose,
  TrackSample,
  TrackSegment,
} from './TrackTypes';

const DEG_TO_RAD = Math.PI / 180;
const SAMPLE_SPACING = 2;

export const defaultTrackGenerationParams: TrackGenerationParams = {
  seed: 42,
  cornerCount: 8,
  longStraightCount: 1,
  minCornerAngleDeg: 25,
  maxCornerAngleDeg: 165,
  tightCornerRadiusMin: 20,
  tightCornerRadiusMax: 32,
  wideCornerRadiusMin: 38,
  wideCornerRadiusMax: 68,
  tightCornerRatio: 0.58,
  normalStraightMinLength: 16,
  normalStraightMaxLength: 46,
  longStraightMinLength: 72,
  longStraightMaxLength: 112,
  roadWidth: 18,
};

interface Candidate {
  segments: TrackSegment[];
  samples: TrackSample[];
  totalLength: number;
  bounds: THREE.Box3;
  score: number;
}

export class TrackGenerationError extends Error {}

export class TrackGenerator {
  generate(
    input: number | Partial<TrackGenerationParams> = {},
  ): TrackData {
    const params = this.resolveParams(input);
    const random = seededRandom(params.seed);
    let best: Candidate | undefined;
    let attemptsUsed = 0;
    const maxAttempts = 420;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      attemptsUsed = attempt;
      const segments = this.generateSegmentChain(params, random);
      if (!segments) continue;
      const compiled = this.sampleSegments(segments, params.roadWidth);
      if (!this.validateSamples(compiled.samples, params.roadWidth)) continue;

      const candidate: Candidate = {
        segments,
        ...compiled,
        score: this.scoreCandidate(segments, compiled.totalLength),
      };
      if (!best || candidate.score > best.score) best = candidate;
      if (best.score > 115 && attempt >= 80) break;
    }

    if (!best) {
      throw new TrackGenerationError(
        `Could not close a valid ${params.cornerCount}-corner circuit for seed ${params.seed}. Try another seed or wider parameter ranges.`,
      );
    }

    return this.createTrackData(params, best, attemptsUsed);
  }

  private resolveParams(input: number | Partial<TrackGenerationParams>): TrackGenerationParams {
    const overrides = typeof input === 'number' ? { seed: input } : input;
    const params = { ...defaultTrackGenerationParams, ...overrides };
    params.seed = Math.floor(params.seed);
    params.cornerCount = Math.max(5, Math.min(14, Math.round(params.cornerCount)));
    params.longStraightCount = params.longStraightCount === 2 ? 2 : 1;
    params.tightCornerRatio = Math.max(0, Math.min(1, params.tightCornerRatio));
    params.roadWidth = Math.max(10, Math.min(28, params.roadWidth));
    [params.minCornerAngleDeg, params.maxCornerAngleDeg] = this.orderedRange(
      params.minCornerAngleDeg,
      params.maxCornerAngleDeg,
    );
    [params.tightCornerRadiusMin, params.tightCornerRadiusMax] = this.orderedRange(
      params.tightCornerRadiusMin,
      params.tightCornerRadiusMax,
    );
    [params.wideCornerRadiusMin, params.wideCornerRadiusMax] = this.orderedRange(
      params.wideCornerRadiusMin,
      params.wideCornerRadiusMax,
    );
    [params.normalStraightMinLength, params.normalStraightMaxLength] = this.orderedRange(
      params.normalStraightMinLength,
      params.normalStraightMaxLength,
    );
    [params.longStraightMinLength, params.longStraightMaxLength] = this.orderedRange(
      params.longStraightMinLength,
      params.longStraightMaxLength,
    );
    const minimumSafeRadius = params.roadWidth / 2 + 5;
    params.tightCornerRadiusMin = Math.max(params.tightCornerRadiusMin, minimumSafeRadius);
    params.tightCornerRadiusMax = Math.max(params.tightCornerRadiusMax, params.tightCornerRadiusMin);
    params.wideCornerRadiusMin = Math.max(params.wideCornerRadiusMin, minimumSafeRadius);
    params.wideCornerRadiusMax = Math.max(params.wideCornerRadiusMax, params.wideCornerRadiusMin);
    return params;
  }

  private generateSegmentChain(
    params: TrackGenerationParams,
    random: () => number,
  ): TrackSegment[] | undefined {
    const closureCorners = 2;
    const freeCorners = params.cornerCount - closureCorners;
    const winding = random() < 0.5 ? -1 : 1;
    const targetTurn = winding * Math.PI * 2;
    const start: TrackPose = { position: new THREE.Vector2(0, 0), heading: 0 };
    let pose: TrackPose = { position: start.position.clone(), heading: start.heading };
    let accumulatedTurn = 0;
    const segments: TrackSegment[] = [];
    const longSlots = this.chooseLongStraightSlots(freeCorners, params.longStraightCount, random);

    for (let index = 0; index < freeCorners; index += 1) {
      const long = longSlots.has(index);
      const straightLength = long
        ? this.randomBetween(random, params.longStraightMinLength, params.longStraightMaxLength)
        : this.randomBetween(random, params.normalStraightMinLength, params.normalStraightMaxLength);
      const straight = createStraight(pose, straightLength, long);
      segments.push(straight);
      pose = straight.end;

      const tight = random() < params.tightCornerRatio || long;
      const radius = tight
        ? this.randomBetween(random, params.tightCornerRadiusMin, params.tightCornerRadiusMax)
        : this.randomBetween(random, params.wideCornerRadiusMin, params.wideCornerRadiusMax);
      const minAngle = params.minCornerAngleDeg;
      const normalMax = Math.min(params.maxCornerAngleDeg, tight ? 125 : 95);
      const hairpinMin = Math.max(minAngle, Math.min(132, params.maxCornerAngleDeg));
      const angleDegrees =
        long && random() < 0.82
          ? this.randomBetween(random, hairpinMin, params.maxCornerAngleDeg)
          : this.randomBetween(random, minAngle, Math.max(minAngle, normalMax));

      const remainingBefore = targetTurn - accumulatedTurn;
      const progress = (index + 1) / freeCorners;
      const preferredSign = Math.sign(remainingBefore) || winding;
      const primaryChance = 0.68 + progress * 0.23;
      const sign = random() < primaryChance ? preferredSign : -preferredSign;
      const sweep = angleDegrees * DEG_TO_RAD * sign;
      const corner = createCorner(pose, radius, sweep, tight ? 'tight' : 'wide');
      segments.push(corner);
      pose = corner.end;
      accumulatedTurn += sweep;

      const remainingFreeCorners = freeCorners - index - 1;
      const remainingTurn = targetTurn - accumulatedTurn;
      const maximumPossibleTurn = (remainingFreeCorners * params.maxCornerAngleDeg + 400) * DEG_TO_RAD;
      if (Math.abs(remainingTurn) > maximumPossibleTurn) return undefined;
      if (pose.position.length() > 390) return undefined;
    }

    if (pose.position.distanceTo(start.position) > 310) return undefined;
    const closing = createBiarc(pose, start);
    if (!closing) return undefined;

    const safeRadius = params.roadWidth / 2 + 5;
    for (const corner of closing) {
      const sweepDegrees = Math.abs(corner.sweepRadians) / DEG_TO_RAD;
      if (
        corner.radius < safeRadius ||
        corner.radius > 190 ||
        sweepDegrees < 4 ||
        sweepDegrees > 205
      ) {
        return undefined;
      }
    }

    const totalTurn = accumulatedTurn + closing[0].sweepRadians + closing[1].sweepRadians;
    if (Math.abs(Math.abs(totalTurn) - Math.PI * 2) > 0.025) return undefined;
    segments.push(...closing);

    const finalPose = closing[1].end;
    if (
      finalPose.position.distanceTo(start.position) > 1e-4 ||
      Math.abs(wrapAngle(finalPose.heading - start.heading)) > 1e-4
    ) {
      return undefined;
    }

    return segments;
  }

  private chooseLongStraightSlots(
    freeCorners: number,
    count: 1 | 2,
    random: () => number,
  ) {
    const slots = new Set<number>();
    slots.add(Math.floor(random() * Math.max(1, Math.floor(freeCorners / 2))));
    if (count === 2) {
      const first = [...slots][0];
      const candidates = Array.from({ length: freeCorners }, (_, index) => index).filter(
        (index) => Math.abs(index - first) > 1,
      );
      slots.add(candidates[Math.floor(random() * candidates.length)] ?? freeCorners - 1);
    }
    return slots;
  }

  private sampleSegments(segments: TrackSegment[], roadWidth: number) {
    const samples: TrackSample[] = [];
    const bounds = new THREE.Box3();
    let distanceAlongTrack = 0;

    segments.forEach((segment, segmentIndex) => {
      const steps = Math.max(1, Math.ceil(segment.length / SAMPLE_SPACING));
      for (let step = 0; step < steps; step += 1) {
        const fraction = step / steps;
        let position: THREE.Vector2;
        let heading: number;
        if (segment.type === 'straight') {
          position = segment.start.position
            .clone()
            .lerp(segment.end.position, fraction);
          heading = segment.start.heading;
        } else {
          heading = segment.start.heading + segment.sweepRadians * fraction;
          const sign = Math.sign(segment.sweepRadians);
          position = segment.center
            .clone()
            .add(
              new THREE.Vector2(
                -Math.cos(heading) * segment.radius * sign,
                Math.sin(heading) * segment.radius * sign,
              ),
            );
        }

        const tangent2 = forwardFromHeading(heading);
        const normal2 = normalFromHeading(heading);
        const center = new THREE.Vector3(position.x, 0, position.y);
        const tangent = new THREE.Vector3(tangent2.x, 0, tangent2.y);
        const normal = new THREE.Vector3(normal2.x, 0, normal2.y);
        const sample: TrackSample = {
          center,
          tangent,
          normal,
          left: center.clone().addScaledVector(normal, roadWidth / 2),
          right: center.clone().addScaledVector(normal, -roadWidth / 2),
          width: roadWidth,
          distanceAlongTrack: distanceAlongTrack + segment.length * fraction,
          sourceSegmentIndex: segmentIndex,
        };
        samples.push(sample);
        bounds.expandByPoint(sample.left);
        bounds.expandByPoint(sample.right);
      }
      distanceAlongTrack += segment.length;
    });

    return { samples, totalLength: distanceAlongTrack, bounds };
  }

  private validateSamples(samples: TrackSample[], roadWidth: number) {
    const clearance = roadWidth + 4;
    const clearanceSq = clearance * clearance;
    const neighbourWindow = Math.ceil(clearance / SAMPLE_SPACING) + 2;

    for (let i = 0; i < samples.length; i += 1) {
      for (let j = i + neighbourWindow; j < samples.length; j += 1) {
        const cyclicDistance = Math.min(j - i, samples.length - (j - i));
        if (cyclicDistance < neighbourWindow) continue;
        if (samples[i].center.distanceToSquared(samples[j].center) < clearanceSq) {
          return false;
        }
      }
    }
    return true;
  }

  private scoreCandidate(segments: TrackSegment[], totalLength: number) {
    const corners = segments.filter(
      (segment): segment is CornerTrackSegment => segment.type === 'corner',
    );
    const directions = new Set(corners.map((corner) => corner.direction)).size;
    const hairpins = corners.filter(
      (corner) => Math.abs(corner.sweepRadians) >= 125 * DEG_TO_RAD,
    ).length;
    const closingLength = corners
      .filter((corner) => corner.closing)
      .reduce((sum, corner) => sum + corner.length, 0);
    const closureRatio = closingLength / totalLength;
    const sweeps = corners.map((corner) => Math.abs(corner.sweepRadians));
    const meanSweep = sweeps.reduce((sum, value) => sum + value, 0) / sweeps.length;
    const variance =
      sweeps.reduce((sum, value) => sum + (value - meanSweep) ** 2, 0) / sweeps.length;

    return (
      70 +
      hairpins * 15 +
      directions * 10 +
      Math.min(20, variance * 18) -
      Math.max(0, closureRatio - 0.32) * 120
    );
  }

  private createTrackData(
    params: TrackGenerationParams,
    candidate: Candidate,
    attempts: number,
  ): TrackData {
    const sampleAtFraction = (fraction: number) => {
      const target = candidate.totalLength * fraction;
      let best = candidate.samples[0];
      for (const sample of candidate.samples) {
        if (Math.abs(sample.distanceAlongTrack - target) < Math.abs(best.distanceAlongTrack - target)) {
          best = sample;
        }
      }
      return best;
    };

    const checkpoints = [0.18, 0.36, 0.54, 0.72, 0.9].map((fraction, index) => {
      const sample = sampleAtFraction(fraction);
      return {
        position: sample.center.clone(),
        tangent: sample.tangent.clone(),
        index,
      };
    });
    const start = sampleAtFraction(0.015);
    const surfaceZones = [0.26, 0.61].map((fraction, index) => {
      const sample = sampleAtFraction(fraction);
      return {
        type: 'oil' as const,
        center: sample.center.clone().addScaledVector(sample.normal, index === 0 ? -3 : 3),
        radius: 9,
      };
    });

    return {
      seed: params.seed,
      generationParams: { ...params },
      segments: candidate.segments,
      samples: candidate.samples,
      totalLength: candidate.totalLength,
      bounds: candidate.bounds,
      generationAttempts: attempts,
      checkpoints,
      startPosition: start.center.clone(),
      startHeading: Math.atan2(start.tangent.x, start.tangent.z),
      roadWidth: params.roadWidth,
      surfaceZones,
    };
  }

  private randomBetween(random: () => number, min: number, max: number) {
    return min + (max - min) * random();
  }

  private orderedRange(a: number, b: number): [number, number] {
    return a <= b ? [a, b] : [b, a];
  }
}
