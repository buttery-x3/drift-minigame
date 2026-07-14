import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { TrackGenerator, defaultTrackGenerationParams } from './TrackGenerator';
import { WALL_HEIGHT, createTrackBoundarySegments } from './TrackBoundaries';
import { ROAD_SURFACE_Y, TRACK_OVERLAY_Y, TrackMesh } from './TrackMesh';

describe('TrackMesh', () => {
  it('renders walls only in race mode using the shared boundary transforms', () => {
    const track = new TrackGenerator().generate({ ...defaultTrackGenerationParams, seed: 42 });
    const preview = new TrackMesh(track, { mode: 'preview' });
    const race = new TrackMesh(track, { mode: 'race' });
    const walls = race.group.getObjectByName('circuit-walls');

    expect(preview.group.getObjectByName('circuit-walls')).toBeUndefined();
    expect(walls).toBeInstanceOf(THREE.InstancedMesh);

    const wallInstances = walls as THREE.InstancedMesh;
    const segments = createTrackBoundarySegments(track);
    expect(wallInstances.count).toBe(segments.length);

    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const rotation = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    wallInstances.getMatrixAt(0, matrix);
    matrix.decompose(position, rotation, scale);
    expect(position.x).toBeCloseTo(segments[0].midpoint.x);
    expect(position.y).toBeCloseTo(WALL_HEIGHT / 2);
    expect(position.z).toBeCloseTo(segments[0].midpoint.z);
    expect(scale.z).toBeCloseTo(segments[0].length);

    preview.dispose();
    race.dispose();
  });

  it('places oil zones above the road surface', () => {
    const track = new TrackGenerator().generate({ ...defaultTrackGenerationParams, seed: 42 });
    const race = new TrackMesh(track, { mode: 'race' });
    const oilZones: THREE.Object3D[] = [];
    race.group.traverse((object) => {
      if (object.name === 'oil-zone') oilZones.push(object);
    });

    expect(oilZones).toHaveLength(track.surfaceZones.length);
    expect(TRACK_OVERLAY_Y).toBeGreaterThan(ROAD_SURFACE_Y);
    for (const oilZone of oilZones) {
      expect(oilZone.position.y).toBe(TRACK_OVERLAY_Y);
    }

    race.dispose();
  });
});
