import * as THREE from 'three';
import {
  WALL_HEIGHT,
  WALL_THICKNESS,
  createTrackBoundarySegments,
} from './TrackBoundaries';
import type { TrackData } from './TrackTypes';

export const ROAD_SURFACE_Y = 0.08;
export const TRACK_OVERLAY_Y = 0.1;

interface TrackMeshOptions {
  mode?: 'preview' | 'race';
  showSegmentOverlay?: boolean;
}

export class TrackMesh {
  readonly group = new THREE.Group();
  readonly road: THREE.Mesh;

  constructor(track: TrackData, options: TrackMeshOptions = {}) {
    const mode = options.mode ?? 'race';
    this.road = this.createRoad(track);
    this.group.add(this.createGround(track));
    this.group.add(this.road);
    this.group.add(this.createEdges(track));
    this.group.add(this.createStartLine(track));
    if (mode === 'race') {
      this.group.add(this.createWalls(track));
      this.group.add(this.createOilZones(track));
      this.group.add(this.createCheckpoints(track));
    }
    if (options.showSegmentOverlay) {
      this.group.add(this.createSegmentOverlay(track));
    }
  }

  dispose() {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Line) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
  }

  private createGround(track: TrackData) {
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    track.bounds.getSize(size);
    track.bounds.getCenter(center);
    const geometry = new THREE.PlaneGeometry(size.x + 1000, size.z + 1000, 1, 1);
    geometry.rotateX(-Math.PI / 2);
    const material = new THREE.MeshLambertMaterial({ color: 0x3c6f45 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = center.x;
    mesh.position.z = center.z;
    mesh.position.y = -0.04;
    return mesh;
  }

  private createRoad(track: TrackData) {
    const vertices: number[] = [];
    const indices: number[] = [];
    const uvs: number[] = [];

    for (let i = 0; i < track.samples.length; i += 1) {
      const sample = track.samples[i];
      vertices.push(sample.left.x, ROAD_SURFACE_Y, sample.left.z);
      vertices.push(sample.right.x, ROAD_SURFACE_Y, sample.right.z);
      uvs.push(0, sample.distanceAlongTrack / 16, 1, sample.distanceAlongTrack / 16);
    }

    for (let i = 0; i < track.samples.length; i += 1) {
      const next = (i + 1) % track.samples.length;
      const a = i * 2;
      const b = i * 2 + 1;
      const c = next * 2;
      const d = next * 2 + 1;
      indices.push(a, c, b, b, c, d);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const material = new THREE.MeshLambertMaterial({
      color: 0x8a8d8d,
      side: THREE.DoubleSide,
    });
    return new THREE.Mesh(geometry, material);
  }

  private createEdges(track: TrackData) {
    const vertices: number[] = [];
    for (let i = 0; i < track.samples.length; i += 1) {
      const next = track.samples[(i + 1) % track.samples.length];
      const sample = track.samples[i];
      vertices.push(sample.left.x, 0.12, sample.left.z, next.left.x, 0.12, next.left.z);
      vertices.push(sample.right.x, 0.12, sample.right.z, next.right.x, 0.12, next.right.z);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    return new THREE.LineSegments(
      geometry,
      new THREE.LineBasicMaterial({ color: 0xf7d36b }),
    );
  }

  private createWalls(track: TrackData) {
    const segments = createTrackBoundarySegments(track);
    const geometry = new THREE.BoxGeometry(WALL_THICKNESS, WALL_HEIGHT, 1);
    const material = new THREE.MeshLambertMaterial({ color: 0xd7cbb5 });
    const mesh = new THREE.InstancedMesh(geometry, material, segments.length);
    const transform = new THREE.Object3D();

    segments.forEach((segment, index) => {
      transform.position.set(segment.midpoint.x, WALL_HEIGHT / 2, segment.midpoint.z);
      transform.rotation.set(0, segment.angle, 0);
      transform.scale.set(1, 1, segment.length);
      transform.updateMatrix();
      mesh.setMatrixAt(index, transform.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.name = 'circuit-walls';
    return mesh;
  }

  private createOilZones(track: TrackData) {
    const group = new THREE.Group();
    const material = new THREE.MeshBasicMaterial({
      color: 0x15161a,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    });
    for (const zone of track.surfaceZones) {
      const geometry = new THREE.CircleGeometry(zone.radius, 32);
      geometry.rotateX(-Math.PI / 2);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(zone.center);
      mesh.position.y = TRACK_OVERLAY_Y;
      mesh.name = 'oil-zone';
      group.add(mesh);
    }
    return group;
  }

  private createCheckpoints(track: TrackData) {
    const group = new THREE.Group();
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.22,
    });
    for (const checkpoint of track.checkpoints) {
      const geometry = new THREE.PlaneGeometry(track.roadWidth, 1.5);
      geometry.rotateX(-Math.PI / 2);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(checkpoint.position);
      mesh.position.y = TRACK_OVERLAY_Y;
      mesh.rotation.y = Math.atan2(checkpoint.tangent.x, checkpoint.tangent.z);
      group.add(mesh);
    }
    return group;
  }

  private createStartLine(track: TrackData) {
    const sample = track.samples[0];
    const geometry = new THREE.PlaneGeometry(track.roadWidth, 2.5);
    geometry.rotateX(-Math.PI / 2);
    const material = new THREE.MeshBasicMaterial({ color: 0xf5f0df });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(sample.center);
    mesh.position.y = 0.13;
    mesh.rotation.y = Math.atan2(sample.tangent.x, sample.tangent.z);
    return mesh;
  }

  private createSegmentOverlay(track: TrackData) {
    const group = new THREE.Group();
    for (let segmentIndex = 0; segmentIndex < track.segments.length; segmentIndex += 1) {
      const segment = track.segments[segmentIndex];
      const points = track.samples
        .filter((sample) => sample.sourceSegmentIndex === segmentIndex)
        .map((sample) => new THREE.Vector3(sample.center.x, 0.2, sample.center.z));
      const nextSegmentSample = track.samples.find(
        (sample) => sample.sourceSegmentIndex === (segmentIndex + 1) % track.segments.length,
      );
      if (nextSegmentSample) {
        points.push(new THREE.Vector3(nextSegmentSample.center.x, 0.2, nextSegmentSample.center.z));
      }
      if (points.length < 2) continue;

      const color =
        segment.type === 'straight'
          ? segment.long
            ? 0xffd166
            : 0xe9ecef
          : segment.closing
            ? 0xc77dff
            : segment.classification === 'tight'
              ? 0xff6b6b
              : 0x4cc9f0;
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      group.add(new THREE.Line(geometry, new THREE.LineBasicMaterial({ color })));
    }
    return group;
  }
}
