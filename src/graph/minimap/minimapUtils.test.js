/// <reference types="vitest" />
import { toMini } from './minimapUtils';

describe('minimapUtils.toMini', () => {
  test('maps graph coordinates into minimap coordinates within bounds', () => {
    const bounds = {
      minX: 0,
      minY: 0,
      width: 100,
      height: 50,
    };

    const p = toMini(50, 25, bounds);
    // should be inside the minimap canvas (PAD offset is 10, WIDTH=200 HEIGHT=140)
    expect(p.x).toBeGreaterThan(9);
    expect(p.x).toBeLessThan(191);
    expect(p.y).toBeGreaterThan(9);
    expect(p.y).toBeLessThan(131);
  });
});
