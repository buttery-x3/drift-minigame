import { describe, expect, it } from 'vitest';
import { TrackGenerator, defaultTrackGenerationParams } from './TrackGenerator';
import {
  WALL_OFFSET,
  WALL_SAMPLE_STEP,
  createTrackBoundarySegments,
} from './TrackBoundaries';

describe('track boundaries', () => {
  it('creates matching left and right wall segments around the full circuit', () => {
    const track = new TrackGenerator().generate({ ...defaultTrackGenerationParams, seed: 42 });
    const segments = createTrackBoundarySegments(track);
    const segmentsPerSide = Math.ceil(track.samples.length / WALL_SAMPLE_STEP);

    expect(segments).toHaveLength(segmentsPerSide * 2);
    expect(segments.filter((segment) => segment.side === 'left')).toHaveLength(segmentsPerSide);
    expect(segments.filter((segment) => segment.side === 'right')).toHaveLength(segmentsPerSide);

    const firstSample = track.samples[0];
    const firstLeft = segments[0];
    const firstRight = segments[segmentsPerSide];
    expect(firstLeft.start.distanceTo(firstSample.left)).toBeCloseTo(WALL_OFFSET);
    expect(firstRight.start.distanceTo(firstSample.right)).toBeCloseTo(WALL_OFFSET);
    expect(firstLeft.length).toBeGreaterThan(0);
    expect(firstRight.length).toBeGreaterThan(0);
  });

  it('derives each transform from its segment endpoints', () => {
    const track = new TrackGenerator().generate({ ...defaultTrackGenerationParams, seed: 7 });
    const segment = createTrackBoundarySegments(track)[0];

    expect(segment.midpoint.x).toBeCloseTo((segment.start.x + segment.end.x) / 2);
    expect(segment.midpoint.z).toBeCloseTo((segment.start.z + segment.end.z) / 2);
    expect(segment.length).toBeCloseTo(segment.start.distanceTo(segment.end));
    expect(segment.angle).toBeCloseTo(
      Math.atan2(segment.end.x - segment.start.x, segment.end.z - segment.start.z),
    );
  });
});
