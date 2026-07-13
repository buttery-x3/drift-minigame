import { describe, expect, it } from 'vitest';
import { TrackGenerator, defaultTrackGenerationParams } from './TrackGenerator';

describe('TrackGenerator', () => {
  it('is deterministic and respects the requested counts', () => {
    const generator = new TrackGenerator();
    const first = generator.generate({ ...defaultTrackGenerationParams, seed: 1234 });
    const second = generator.generate({ ...defaultTrackGenerationParams, seed: 1234 });
    expect(first.segments.map((segment) => segment.length)).toEqual(
      second.segments.map((segment) => segment.length),
    );
    expect(first.segments.filter((segment) => segment.type === 'corner')).toHaveLength(8);
    expect(first.segments.filter((segment) => segment.type === 'straight' && segment.long)).toHaveLength(
      1,
    );
  });

  it('closes valid circuits for a representative seed batch', () => {
    const generator = new TrackGenerator();
    for (let seed = 1; seed <= 20; seed += 1) {
      const track = generator.generate({ ...defaultTrackGenerationParams, seed });
      const first = track.segments[0].start;
      const last = track.segments.at(-1)!.end;
      expect(last.position.distanceTo(first.position)).toBeLessThan(1e-4);
      expect(track.samples.length).toBeGreaterThan(100);
      expect(track.totalLength).toBeGreaterThan(250);
    }
  });

  it('supports the primary UI parameter combinations', () => {
    const generator = new TrackGenerator();
    const combinations = [
      { cornerCount: 6, longStraightCount: 1 as const },
      { cornerCount: 10, longStraightCount: 2 as const },
      { cornerCount: 12, longStraightCount: 2 as const, tightCornerRatio: 0.3 },
    ];
    for (const combination of combinations) {
      for (let seed = 30; seed < 35; seed += 1) {
        const track = generator.generate({
          ...defaultTrackGenerationParams,
          ...combination,
          seed,
        });
        expect(track.segments.filter((segment) => segment.type === 'corner')).toHaveLength(
          combination.cornerCount,
        );
        expect(track.segments.filter((segment) => segment.type === 'straight' && segment.long)).toHaveLength(
          combination.longStraightCount,
        );
      }
    }
  });
});
