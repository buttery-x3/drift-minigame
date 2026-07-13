import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createBiarc, createCorner, createStraight, wrapAngle } from './TrackGeometry';

describe('track segment geometry', () => {
  it('advances a straight along its heading', () => {
    const segment = createStraight({ position: new THREE.Vector2(0, 0), heading: 0 }, 40);
    expect(segment.end.position.x).toBeCloseTo(0);
    expect(segment.end.position.y).toBeCloseTo(40);
  });

  it('creates an exact half-circle hairpin', () => {
    const segment = createCorner(
      { position: new THREE.Vector2(0, 0), heading: 0 },
      20,
      Math.PI,
      'tight',
    );
    expect(segment.end.position.x).toBeCloseTo(40);
    expect(segment.end.position.y).toBeCloseTo(0);
    expect(wrapAngle(segment.end.heading)).toBeCloseTo(Math.PI);
    expect(segment.length).toBeCloseTo(Math.PI * 20);
  });

  it('joins two oriented poses with tangent-continuous arcs', () => {
    const start = { position: new THREE.Vector2(30, 90), heading: Math.PI * 0.8 };
    const end = { position: new THREE.Vector2(0, 0), heading: 0 };
    const biarc = createBiarc(start, end);
    expect(biarc).toBeDefined();
    if (!biarc) return;
    expect(biarc[0].end.position.distanceTo(biarc[1].start.position)).toBeLessThan(1e-5);
    expect(Math.abs(wrapAngle(biarc[0].end.heading - biarc[1].start.heading))).toBeLessThan(1e-4);
    expect(biarc[1].end.position.distanceTo(end.position)).toBeLessThan(1e-5);
    expect(Math.abs(wrapAngle(biarc[1].end.heading - end.heading))).toBeLessThan(1e-5);
  });
});
