import { describe, expect, it } from 'vitest';
import { distributeSchedule, resolvePlatforms } from '../../src/services/generation.js';

describe('resolvePlatforms', () => {
  it('round-robins across configured platforms when no override is given', () => {
    expect(resolvePlatforms(5, undefined, ['FACEBOOK', 'INSTAGRAM'])).toEqual([
      'FACEBOOK',
      'INSTAGRAM',
      'FACEBOOK',
      'INSTAGRAM',
      'FACEBOOK',
    ]);
  });

  it('uses a single platform for every post when overridden with one platform', () => {
    expect(resolvePlatforms(3, ['INSTAGRAM'], ['FACEBOOK', 'INSTAGRAM'])).toEqual([
      'INSTAGRAM',
      'INSTAGRAM',
      'INSTAGRAM',
    ]);
  });

  it('round-robins across an explicit subset of platforms when overridden with multiple', () => {
    expect(resolvePlatforms(4, ['INSTAGRAM'], ['FACEBOOK', 'INSTAGRAM'])).toEqual([
      'INSTAGRAM',
      'INSTAGRAM',
      'INSTAGRAM',
      'INSTAGRAM',
    ]);
    expect(resolvePlatforms(3, ['FACEBOOK', 'INSTAGRAM'], ['FACEBOOK'])).toEqual([
      'FACEBOOK',
      'INSTAGRAM',
      'FACEBOOK',
    ]);
  });
});

describe('distributeSchedule', () => {
  it('spreads posts across the next 7 days, starting at the given date', () => {
    const start = new Date('2026-06-15T08:00:00.000Z');
    const schedule = distributeSchedule(5, start);

    expect(schedule).toHaveLength(5);
    expect(schedule[0]?.toISOString()).toBe(start.toISOString());

    for (let i = 1; i < schedule.length; i += 1) {
      expect(schedule[i]!.getTime()).toBeGreaterThanOrEqual(schedule[i - 1]!.getTime());
    }

    const last = schedule.at(-1)!;
    const maxOffsetMs = 7 * 24 * 60 * 60 * 1000;
    expect(last.getTime() - start.getTime()).toBeLessThanOrEqual(maxOffsetMs);
  });

  it('schedules a single post on the start date', () => {
    const start = new Date('2026-06-15T08:00:00.000Z');
    expect(distributeSchedule(1, start)).toEqual([start]);
  });
});
