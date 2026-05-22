import * as THREE from 'three';

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function signedAngleBetween(a: THREE.Vector3, b: THREE.Vector3) {
  const cross = a.x * b.z - a.z * b.x;
  const dot = a.x * b.x + a.z * b.z;
  return Math.atan2(cross, dot);
}

export function vec3FromRapier(v: { x: number; y: number; z: number }) {
  return new THREE.Vector3(v.x, v.y, v.z);
}
