import * as THREE from 'three';
import type { TrackData } from './TrackTypes';

export class TrackMesh {
  readonly group = new THREE.Group();
  readonly road: THREE.Mesh;

  constructor(track: TrackData) {
    this.road = this.createRoad(track);
    this.group.add(this.createGround());
    this.group.add(this.road);
    this.group.add(this.createEdges(track));
    this.group.add(this.createOilZones(track));
    this.group.add(this.createCheckpoints(track));
  }

  dispose() {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
  }

  private createGround() {
    const geometry = new THREE.PlaneGeometry(420, 420, 1, 1);
    geometry.rotateX(-Math.PI / 2);
    const material = new THREE.MeshLambertMaterial({ color: 0x3c6f45 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = -0.04;
    return mesh;
  }

  private createRoad(track: TrackData) {
    const vertices: number[] = [];
    const indices: number[] = [];
    const uvs: number[] = [];
    const roadY = 0.08;

    for (let i = 0; i < track.samples.length; i += 1) {
      const sample = track.samples[i];
      vertices.push(sample.left.x, roadY, sample.left.z);
      vertices.push(sample.right.x, roadY, sample.right.z);
      uvs.push(0, i / 8, 1, i / 8);
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
      mesh.position.y = 0.03;
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
      mesh.position.y = 0.04;
      mesh.rotation.y = Math.atan2(checkpoint.tangent.x, checkpoint.tangent.z);
      group.add(mesh);
    }
    return group;
  }
}
