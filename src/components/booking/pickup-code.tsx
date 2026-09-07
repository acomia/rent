import { useMemo } from 'react';
import { View } from 'react-native';

import { INK } from '@/components/catalog/catalog-style';

/**
 * The block shown to shop staff at pickup.
 *
 * NOTE: this renders a deterministic pattern derived from the booking
 * reference — it is a visual placeholder, NOT a scannable code. A real QR needs
 * an encoder (react-native-qrcode-svg + react-native-svg); wiring that up is
 * part of the pickup work, not the design pass.
 */
const GRID = 21;
// Hoisted: these were rebuilt 441 times per render.
const CELL = { width: `${100 / GRID}%`, height: `${100 / GRID}%` } as const;
const ON = { ...CELL, backgroundColor: INK };
const OFF = { ...CELL, backgroundColor: 'transparent' };

export function PickupCode({ reference }: { reference: string }) {
  const cells = useMemo(() => {
    let h = 2166136261;
    for (let i = 0; i < reference.length; i++) {
      h ^= reference.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    const out: boolean[] = [];
    let seed = Math.abs(h) || 1;
    for (let i = 0; i < GRID * GRID; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      out.push((seed >> 16) % 3 === 0);
    }
    // Finder squares in three corners, so it reads as a code at a glance.
    const finder = (r0: number, c0: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          const edge = r === 0 || r === 6 || c === 0 || c === 6;
          const core = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          out[(r0 + r) * GRID + (c0 + c)] = edge || core;
        }
      }
    };
    finder(0, 0);
    finder(0, GRID - 7);
    finder(GRID - 7, 0);
    return out;
  }, [reference]);

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`Pickup code for booking ${reference}`}
      className="aspect-square w-52 flex-row flex-wrap overflow-hidden rounded-xl bg-white p-2"
    >
      {cells.map((on, i) => (
        <View key={i} style={on ? ON : OFF} />
      ))}
    </View>
  );
}
