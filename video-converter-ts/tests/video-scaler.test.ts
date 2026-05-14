/**
 * VideoScaler unit tests
 *
 * Tests validation logic that does not require FFmpeg.
 * End-to-end scaling tests (with real FFmpeg) are in tests/functional/.
 */

import { describe, it, expect } from 'vitest';
import { VideoScaler } from '../src/preprocess/video-scaler.js';
import { VideoConverterError } from '../src/errors.js';

describe('VideoScaler', () => {
  describe('instantiation', () => {
    it('creates an instance without a progress callback', () => {
      expect(() => new VideoScaler()).not.toThrow();
    });

    it('creates an instance with a progress callback', () => {
      const cb = (_c: number, _t: number) => {};
      expect(() => new VideoScaler(cb)).not.toThrow();
    });
  });

  describe('scale() — input validation', () => {
    const scaler = new VideoScaler();

    it('throws VideoConverterError when neither width nor height is provided', async () => {
      await expect(
        scaler.scale('/input.mp4', '/output.mp4', {})
      ).rejects.toThrow(VideoConverterError);
    });

    it('throws VideoConverterError with a descriptive message when no dimensions given', async () => {
      await expect(
        scaler.scale('/input.mp4', '/output.mp4', {})
      ).rejects.toThrow(/width or height/i);
    });

    it('throws VideoConverterError when width is zero', async () => {
      await expect(
        scaler.scale('/input.mp4', '/output.mp4', { width: 0 })
      ).rejects.toThrow(VideoConverterError);
    });

    it('throws VideoConverterError when width is negative', async () => {
      await expect(
        scaler.scale('/input.mp4', '/output.mp4', { width: -100 })
      ).rejects.toThrow(VideoConverterError);
    });

    it('throws VideoConverterError when height is zero', async () => {
      await expect(
        scaler.scale('/input.mp4', '/output.mp4', { height: 0 })
      ).rejects.toThrow(VideoConverterError);
    });

    it('throws VideoConverterError when height is negative', async () => {
      await expect(
        scaler.scale('/input.mp4', '/output.mp4', { height: -1 })
      ).rejects.toThrow(VideoConverterError);
    });

    it('throws VideoConverterError when width is a non-integer', async () => {
      await expect(
        scaler.scale('/input.mp4', '/output.mp4', { width: 1.5 })
      ).rejects.toThrow(VideoConverterError);
    });

    it('throws VideoConverterError when height is a non-integer', async () => {
      await expect(
        scaler.scale('/input.mp4', '/output.mp4', { height: 720.9 })
      ).rejects.toThrow(VideoConverterError);
    });
  });
});
