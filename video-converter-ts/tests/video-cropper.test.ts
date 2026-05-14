/**
 * VideoCropper unit tests
 *
 * Tests validation logic that does not require FFmpeg.
 * End-to-end cropping tests (with real FFmpeg) are in tests/functional/.
 */

import { describe, it, expect } from 'vitest';
import { VideoCropper } from '../src/preprocess/video-cropper.js';
import { VideoConverterError } from '../src/errors.js';

describe('VideoCropper', () => {
  describe('instantiation', () => {
    it('creates an instance without a progress callback', () => {
      expect(() => new VideoCropper()).not.toThrow();
    });

    it('creates an instance with a progress callback', () => {
      const cb = (_c: number, _t: number) => {};
      expect(() => new VideoCropper(cb)).not.toThrow();
    });
  });

  describe('crop() — input validation', () => {
    const cropper = new VideoCropper();

    it('throws VideoConverterError when width is zero', async () => {
      await expect(
        cropper.crop('/input.mp4', '/output.mp4', { width: 0, height: 360 })
      ).rejects.toThrow(VideoConverterError);
    });

    it('throws VideoConverterError when width is negative', async () => {
      await expect(
        cropper.crop('/input.mp4', '/output.mp4', { width: -100, height: 360 })
      ).rejects.toThrow(VideoConverterError);
    });

    it('throws VideoConverterError when width is a non-integer', async () => {
      await expect(
        cropper.crop('/input.mp4', '/output.mp4', { width: 640.5, height: 360 })
      ).rejects.toThrow(VideoConverterError);
    });

    it('throws VideoConverterError with a descriptive message for invalid width', async () => {
      await expect(
        cropper.crop('/input.mp4', '/output.mp4', { width: 0, height: 360 })
      ).rejects.toThrow(/width/i);
    });

    it('throws VideoConverterError when height is zero', async () => {
      await expect(
        cropper.crop('/input.mp4', '/output.mp4', { width: 640, height: 0 })
      ).rejects.toThrow(VideoConverterError);
    });

    it('throws VideoConverterError when height is negative', async () => {
      await expect(
        cropper.crop('/input.mp4', '/output.mp4', { width: 640, height: -1 })
      ).rejects.toThrow(VideoConverterError);
    });

    it('throws VideoConverterError when height is a non-integer', async () => {
      await expect(
        cropper.crop('/input.mp4', '/output.mp4', { width: 640, height: 360.9 })
      ).rejects.toThrow(VideoConverterError);
    });

    it('throws VideoConverterError with a descriptive message for invalid height', async () => {
      await expect(
        cropper.crop('/input.mp4', '/output.mp4', { width: 640, height: -5 })
      ).rejects.toThrow(/height/i);
    });

    it('throws VideoConverterError when x is negative', async () => {
      await expect(
        cropper.crop('/input.mp4', '/output.mp4', { width: 640, height: 360, x: -1 })
      ).rejects.toThrow(VideoConverterError);
    });

    it('throws VideoConverterError when x is a non-integer', async () => {
      await expect(
        cropper.crop('/input.mp4', '/output.mp4', { width: 640, height: 360, x: 1.5 })
      ).rejects.toThrow(VideoConverterError);
    });

    it('throws VideoConverterError when y is negative', async () => {
      await expect(
        cropper.crop('/input.mp4', '/output.mp4', { width: 640, height: 360, y: -10 })
      ).rejects.toThrow(VideoConverterError);
    });

    it('throws VideoConverterError when y is a non-integer', async () => {
      await expect(
        cropper.crop('/input.mp4', '/output.mp4', { width: 640, height: 360, y: 0.5 })
      ).rejects.toThrow(VideoConverterError);
    });

    it('allows x = 0 (zero is a valid top-left offset)', async () => {
      // Validation passes; fails later at FFmpeg execution (file not found)
      // so we just confirm the error is NOT a VideoConverterError from validation
      try {
        await cropper.crop('/input.mp4', '/output.mp4', { width: 640, height: 360, x: 0, y: 0 });
      } catch (err) {
        expect(err).not.toBeInstanceOf(VideoConverterError);
      }
    });
  });
});
