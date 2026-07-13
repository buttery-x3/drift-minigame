import * as THREE from 'three';
import type {
  CornerTrackSegment,
  StraightTrackSegment,
  TrackPose,
} from './TrackTypes';

const TAU = Math.PI * 2;
const EPSILON = 1e-6;

export function clonePose(pose: TrackPose): TrackPose {
  return { position: pose.position.clone(), heading: pose.heading };
}

export function forwardFromHeading(heading: number) {
  return new THREE.Vector2(Math.sin(heading), Math.cos(heading));
}

export function normalFromHeading(heading: number) {
  return new THREE.Vector2(Math.cos(heading), -Math.sin(heading));
}

export function wrapAngle(angle: number) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

export function createStraight(
  start: TrackPose,
  length: number,
  long = false,
): StraightTrackSegment {
  const end = clonePose(start);
  end.position.addScaledVector(forwardFromHeading(start.heading), length);
  return {
    type: 'straight',
    start: clonePose(start),
    end,
    length,
    long,
  };
}

export function createCorner(
  start: TrackPose,
  radius: number,
  sweepRadians: number,
  classification: 'tight' | 'wide',
  closing = false,
): CornerTrackSegment {
  const turnSign = Math.sign(sweepRadians) || 1;
  const center = start.position
    .clone()
    .addScaledVector(normalFromHeading(start.heading), radius * turnSign);
  const endHeading = start.heading + sweepRadians;
  const end = {
    position: center
      .clone()
      .add(
        new THREE.Vector2(
          -Math.cos(endHeading) * radius * turnSign,
          Math.sin(endHeading) * radius * turnSign,
        ),
      ),
    heading: endHeading,
  };

  return {
    type: 'corner',
    start: clonePose(start),
    end,
    center,
    radius,
    sweepRadians,
    direction: sweepRadians >= 0 ? 'left' : 'right',
    classification,
    length: Math.abs(sweepRadians) * radius,
    closing,
  };
}

export function createArcToPoint(
  start: TrackPose,
  endPosition: THREE.Vector2,
  closing = true,
): CornerTrackSegment | undefined {
  const displacement = endPosition.clone().sub(start.position);
  const normal = normalFromHeading(start.heading);
  const denominator = 2 * displacement.dot(normal);
  if (displacement.lengthSq() < EPSILON || Math.abs(denominator) < EPSILON) {
    return undefined;
  }

  const signedRadius = displacement.lengthSq() / denominator;
  const radius = Math.abs(signedRadius);
  const sign = Math.sign(signedRadius);
  const center = start.position.clone().addScaledVector(normal, signedRadius);
  const radialEnd = endPosition.clone().sub(center);
  const tangentEnd =
    sign > 0
      ? new THREE.Vector2(radialEnd.y, -radialEnd.x).normalize()
      : new THREE.Vector2(-radialEnd.y, radialEnd.x).normalize();
  const endHeading = Math.atan2(tangentEnd.x, tangentEnd.y);
  let sweep = wrapAngle(endHeading - start.heading);
  if (sign > 0 && sweep <= EPSILON) sweep += TAU;
  if (sign < 0 && sweep >= -EPSILON) sweep -= TAU;

  const arc = createCorner(start, radius, sweep, radius < 38 ? 'tight' : 'wide', closing);
  arc.end.position.copy(endPosition);
  arc.center.copy(center);
  return arc;
}

export function createBiarc(
  start: TrackPose,
  end: TrackPose,
): [CornerTrackSegment, CornerTrackSegment] | undefined {
  const startTangent = forwardFromHeading(start.heading);
  const endTangent = forwardFromHeading(end.heading);
  const displacement = end.position.clone().sub(start.position);
  const tangentDot = startTangent.dot(endTangent);
  const displacementDot = displacement.dot(startTangent.clone().add(endTangent));
  const displacementLengthSq = displacement.lengthSq();

  let tangentDistance: number;
  if (Math.abs(1 - tangentDot) < EPSILON) {
    if (Math.abs(displacementDot) < EPSILON) return undefined;
    tangentDistance = displacementLengthSq / (2 * displacementDot);
  } else {
    const discriminant =
      displacementDot * displacementDot + 2 * (1 - tangentDot) * displacementLengthSq;
    if (discriminant < 0) return undefined;
    tangentDistance =
      (-displacementDot + Math.sqrt(discriminant)) / (2 * (1 - tangentDot));
  }

  if (!Number.isFinite(tangentDistance) || tangentDistance <= EPSILON) return undefined;

  const join = start.position
    .clone()
    .add(end.position)
    .addScaledVector(startTangent, tangentDistance)
    .addScaledVector(endTangent, -tangentDistance)
    .multiplyScalar(0.5);

  const first = createArcToPoint(start, join);
  const reverseEnd: TrackPose = {
    position: end.position.clone(),
    heading: end.heading + Math.PI,
  };
  const reverseSecond = createArcToPoint(reverseEnd, join);
  if (!first || !reverseSecond) return undefined;

  const secondStart: TrackPose = {
    position: join.clone(),
    heading: reverseSecond.end.heading + Math.PI,
  };
  const second = createCorner(
    secondStart,
    reverseSecond.radius,
    -reverseSecond.sweepRadians,
    reverseSecond.classification,
    true,
  );
  second.center.copy(reverseSecond.center);
  second.end.position.copy(end.position);
  second.end.heading = end.heading;

  const joinHeadingError = Math.abs(wrapAngle(first.end.heading - second.start.heading));
  if (joinHeadingError > 1e-3) return undefined;

  return [first, second];
}
