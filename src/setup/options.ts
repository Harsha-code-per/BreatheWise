/**
 * Narrows a <select> value to one of its allowed options, so form state never holds a value
 * the schema would reject, without unchecked type casts.
 */

/** Returns `value` when it is one of `options`, otherwise the first option. */
export function pickOption<T extends string>(options: readonly [T, ...T[]], value: string): T {
  return options.find((option) => option === value) ?? options[0];
}

/** The next free "member-N" id, so ids stay unique however members are added and removed. */
export function nextMemberId(ids: readonly string[]): string {
  let index = ids.length;
  while (ids.includes(`member-${String(index)}`)) index += 1;
  return `member-${String(index)}`;
}
