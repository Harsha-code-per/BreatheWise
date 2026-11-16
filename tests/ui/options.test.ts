import { describe, expect, it } from 'vitest';
import { nextMemberId, pickOption } from '../../src/setup/options';

describe('setup options', () => {
  it('keeps allowed values and falls back to the first option', () => {
    expect(pickOption(['a', 'b'] as const, 'b')).toBe('b');
    expect(pickOption(['a', 'b'] as const, 'zzz')).toBe('a');
  });

  it('finds the next unused member id', () => {
    expect(nextMemberId(['member-0', 'member-1'])).toBe('member-2');
    expect(nextMemberId(['member-1'])).toBe('member-2');
  });
});
