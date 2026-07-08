/**
 * Unit tests for the MCU alignment module.
 *
 * Tests the pure dimension math behind the `align` / `min` features:
 * - MCU block size per sampling factor (420→16×16, 422→16×8, 444/400→8×8)
 * - computeEncodedDimensions: content floor (`min`) + optional MCU rounding (`align`)
 * - isAligned: detecting already-MCU-aligned dimensions
 *
 * Model recap — JPEG always encodes in whole MCUs (physical, invariant). This
 * function returns the SOF (coded) size that gets written into the marker:
 *   content = max(size, max(min ?? MCU, MCU))     // `min` sets the content floor
 *   SOF     = align ? roundUpToMCU(content) : content   // `align` gates rounding
 */

import { describe, it, expect } from 'vitest';
import {
  mcuSizeOf,
  computeEncodedDimensions,
  isAligned,
} from '../../src/alignment.js';
import { SamplingFactor } from '../../src/types.js';

describe('alignment', () => {
  describe('mcuSizeOf', () => {
    it('returns 16×16 for YUV420 (4:2:0)', () => {
      expect(mcuSizeOf(SamplingFactor.YUV420)).toEqual({ width: 16, height: 16 });
    });

    it('returns 16×8 for YUV422 (4:2:2)', () => {
      expect(mcuSizeOf(SamplingFactor.YUV422)).toEqual({ width: 16, height: 8 });
    });

    it('returns 8×8 for YUV444 (4:4:4)', () => {
      expect(mcuSizeOf(SamplingFactor.YUV444)).toEqual({ width: 8, height: 8 });
    });

    it('returns 8×8 for Grayscale (400)', () => {
      expect(mcuSizeOf(SamplingFactor.Grayscale)).toEqual({ width: 8, height: 8 });
    });
  });

  describe('computeEncodedDimensions — align on (MCU-rounded SOF)', () => {
    it('rounds 686×686 up to 688×688 for YUV420', () => {
      // 686 / 16 = 42.875 → 43 * 16 = 688
      expect(computeEncodedDimensions(686, 686, SamplingFactor.YUV420, true)).toEqual({
        width: 688,
        height: 688,
      });
    });

    it('rounds independently on each axis for YUV422 (16×8)', () => {
      // width rounds to /16, height rounds to /8
      expect(computeEncodedDimensions(100, 50, SamplingFactor.YUV422, true)).toEqual({
        width: 112, // ceil(100/16)*16
        height: 56, // ceil(50/8)*8
      });
    });

    it('rounds to the 8×8 grid for YUV444', () => {
      expect(computeEncodedDimensions(100, 50, SamplingFactor.YUV444, true)).toEqual({
        width: 104, // ceil(100/8)*8
        height: 56, // ceil(50/8)*8
      });
    });

    it('rounds to the 8×8 grid for Grayscale', () => {
      expect(computeEncodedDimensions(100, 50, SamplingFactor.Grayscale, true)).toEqual({
        width: 104,
        height: 56,
      });
    });

    it('leaves already-aligned dimensions unchanged', () => {
      expect(computeEncodedDimensions(688, 688, SamplingFactor.YUV420, true)).toEqual({
        width: 688,
        height: 688,
      });
      expect(computeEncodedDimensions(16, 16, SamplingFactor.YUV420, true)).toEqual({
        width: 16,
        height: 16,
      });
    });

    it('never rounds down', () => {
      // A single pixel over a boundary must round up to the next MCU.
      expect(computeEncodedDimensions(17, 17, SamplingFactor.YUV420, true)).toEqual({
        width: 32,
        height: 32,
      });
    });

    it('raises a small image up to an already-MCU minimum', () => {
      // 40×40 @ 420, min 64×64 → content 64 → aligned 64 (64 is a multiple of 16)
      expect(
        computeEncodedDimensions(40, 40, SamplingFactor.YUV420, true, {
          width: 64,
          height: 64,
        })
      ).toEqual({ width: 64, height: 64 });
    });

    it('rounds a non-MCU minimum content up to the MCU boundary', () => {
      // min 50 > original 40 → content 50 → align rounds up to 64
      expect(
        computeEncodedDimensions(40, 40, SamplingFactor.YUV420, true, {
          width: 50,
          height: 50,
        })
      ).toEqual({ width: 64, height: 64 });
    });

    it('clamps a minimum below the MCU up to the MCU ("不应小于 mcu")', () => {
      // min 8 < 16 MCU → treated as 16; original 4 → content 16 → aligned 16
      expect(
        computeEncodedDimensions(4, 4, SamplingFactor.YUV420, true, {
          width: 8,
          height: 8,
        })
      ).toEqual({ width: 16, height: 16 });
    });

    it('is a no-op minimum when smaller than the original (pure alignment)', () => {
      // 686×686 @ 420 with a tiny 64 min → same as pure alignment (688)
      expect(
        computeEncodedDimensions(686, 686, SamplingFactor.YUV420, true, {
          width: 64,
          height: 64,
        })
      ).toEqual({ width: 688, height: 688 });
    });

    it('applies the minimum per axis independently', () => {
      // width floored at 64, height defaults to MCU (16) → 40 rounds to 48
      expect(
        computeEncodedDimensions(40, 40, SamplingFactor.YUV420, true, { width: 64 })
      ).toEqual({ width: 64, height: 48 });
    });

    it('treats an empty min object like no min', () => {
      expect(
        computeEncodedDimensions(40, 40, SamplingFactor.YUV420, true, {})
      ).toEqual(computeEncodedDimensions(40, 40, SamplingFactor.YUV420, true));
    });

    it('rounds the minimum with per-factor MCU (422 = 16×8)', () => {
      // min 100×100 @ 422 → width roundUp/16 = 112, height roundUp/8 = 104
      expect(
        computeEncodedDimensions(10, 10, SamplingFactor.YUV422, true, {
          width: 100,
          height: 100,
        })
      ).toEqual({ width: 112, height: 104 });
    });
  });

  describe('computeEncodedDimensions — align off (exact content SOF, no MCU rounding)', () => {
    it('leaves a non-MCU original untouched (encoder pads internally, decoder crops)', () => {
      // 686×686 @ 420, align off → SOF stays 686 (physical MCU 688 is invisible)
      expect(computeEncodedDimensions(686, 686, SamplingFactor.YUV420, false)).toEqual({
        width: 686,
        height: 686,
      });
    });

    it('raises to the exact minimum WITHOUT rounding to MCU', () => {
      // 40×40 @ 420, min 50×50, align off → SOF = 50 (NOT 64)
      expect(
        computeEncodedDimensions(40, 40, SamplingFactor.YUV420, false, {
          width: 50,
          height: 50,
        })
      ).toEqual({ width: 50, height: 50 });
    });

    it('uses an MCU-multiple minimum as-is', () => {
      expect(
        computeEncodedDimensions(40, 40, SamplingFactor.YUV420, false, {
          width: 64,
          height: 64,
        })
      ).toEqual({ width: 64, height: 64 });
    });

    it('keeps a large non-MCU minimum exact', () => {
      // min 100 > original, align off → 100 (NOT 112)
      expect(
        computeEncodedDimensions(10, 10, SamplingFactor.YUV420, false, {
          width: 100,
          height: 100,
        })
      ).toEqual({ width: 100, height: 100 });
    });

    it('is a no-op when the minimum is below the original', () => {
      // 686×686, min 64 (<orig), align off → original unchanged
      expect(
        computeEncodedDimensions(686, 686, SamplingFactor.YUV420, false, {
          width: 64,
          height: 64,
        })
      ).toEqual({ width: 686, height: 686 });
    });

    it('applies min per axis; the un-floored axis stays at the original (not MCU-rounded)', () => {
      // width min 64 → 64; height defaults to MCU floor 16, max(40,16)=40, align off → 40
      expect(
        computeEncodedDimensions(40, 40, SamplingFactor.YUV420, false, { width: 64 })
      ).toEqual({ width: 64, height: 40 });
    });

    it('still enforces the MCU floor on the minimum ("不应小于 mcu")', () => {
      // min 8 < MCU 16 → floored to 16; original 4 → content 16; align off → 16
      expect(
        computeEncodedDimensions(4, 4, SamplingFactor.YUV420, false, {
          width: 8,
          height: 8,
        })
      ).toEqual({ width: 16, height: 16 });
    });

    it('keeps the exact content for 444 (physical MCU is larger but invisible)', () => {
      // 40×40 @ 444 (MCU 8), min 50, align off → SOF 50 (physical would be 56)
      expect(
        computeEncodedDimensions(40, 40, SamplingFactor.YUV444, false, {
          width: 50,
          height: 50,
        })
      ).toEqual({ width: 50, height: 50 });
    });
  });

  describe('isAligned', () => {
    it('is true when both dimensions sit on the MCU grid', () => {
      expect(isAligned(688, 688, SamplingFactor.YUV420)).toBe(true);
      expect(isAligned(16, 32, SamplingFactor.YUV420)).toBe(true);
    });

    it('is false when either dimension is off the grid', () => {
      expect(isAligned(686, 688, SamplingFactor.YUV420)).toBe(false);
      expect(isAligned(688, 686, SamplingFactor.YUV420)).toBe(false);
      expect(isAligned(686, 686, SamplingFactor.YUV420)).toBe(false);
    });

    it('respects per-factor MCU sizes', () => {
      // 100×56 is aligned for 422 (16×8) but not for 420 (16×16).
      expect(isAligned(112, 56, SamplingFactor.YUV422)).toBe(true);
      expect(isAligned(112, 56, SamplingFactor.YUV420)).toBe(false);
    });
  });
});
