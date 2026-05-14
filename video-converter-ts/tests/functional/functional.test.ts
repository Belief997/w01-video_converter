/**
 * video-converter-ts 功能测试
 *
 * 端到端测试，验证实际 FFmpeg 转换流程。
 * 运行前请确保：
 *   1. FFmpeg 已安装（ffmpeg -version）
 *   2. 测试视频存在：../../test_video/birds.mp4（相对于本文件）
 *
 * 运行方式（在 video-converter-ts/ 目录下）：
 *   npm test -- --run tests/functional/functional.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync, statSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { tmpdir } from 'os';
import { mkdtempSync, rmSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 测试视频路径（相对于仓库根目录）
const REPO_ROOT = join(__dirname, '..', '..', '..');
const TEST_VIDEO = join(REPO_ROOT, 'test_video', 'birds.mp4');

// 检查 FFmpeg 是否可用
function isFFmpegAvailable(): boolean {
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const ffmpegAvailable = isFFmpegAvailable();
const videoExists = existsSync(TEST_VIDEO);
const canRun = ffmpegAvailable && videoExists;

// 动态导入（需要已 build）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let VideoConverter: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let OutputFormat: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let VideoScaler: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let VideoCropper: any;

beforeAll(async () => {
  if (canRun) {
    const mod = await import('../../src/index.js');
    VideoConverter = mod.VideoConverter;
    OutputFormat = mod.OutputFormat;
    VideoScaler = mod.VideoScaler;
    VideoCropper = mod.VideoCropper;
  }
});

describe.skipIf(!canRun)(
  `视频转换器功能测试${!ffmpegAvailable ? ' [跳过: FFmpeg 未安装]' : ''}${!videoExists ? ` [跳过: 测试视频不存在 ${TEST_VIDEO}]` : ''}`,
  () => {
    let tmpDir: string;

    beforeAll(() => {
      tmpDir = mkdtempSync(join(tmpdir(), 'vc-test-'));
    });

    afterAll(() => {
      rmSync(tmpDir, { recursive: true, force: true });
    });

    it('getVideoInfo - 解析视频信息', async () => {
      const converter = new VideoConverter();
      const info = await converter.getVideoInfo(TEST_VIDEO);

      expect(info.width).toBeGreaterThan(0);
      expect(info.height).toBeGreaterThan(0);
      expect(info.frameRate).toBeGreaterThan(0);
      expect(info.frameCount).toBeGreaterThan(0);
      expect(info.duration).toBeGreaterThan(0);
      expect(info.codec).toBeTruthy();

      console.log(`  视频信息: ${info.width}x${info.height} @ ${info.frameRate}fps, ${info.frameCount}帧`);
    });

    it('convert - MJPEG 格式', async () => {
      const converter = new VideoConverter();
      const outputPath = join(tmpDir, 'output.mjpeg');

      const result = await converter.convert(TEST_VIDEO, outputPath, OutputFormat.MJPEG, { quality: 5 });

      expect(result.success).toBe(true);
      expect(existsSync(outputPath)).toBe(true);
      expect(statSync(outputPath).size).toBeGreaterThan(0);

      // 验证以 JPEG SOI 开始
      const data = readFileSync(outputPath);
      expect(data[0]).toBe(0xff);
      expect(data[1]).toBe(0xd8);

      console.log(`  MJPEG: ${statSync(outputPath).size} 字节`);
    });

    it('convert - AVI-MJPEG 格式', async () => {
      const converter = new VideoConverter();
      const outputPath = join(tmpDir, 'output.avi');

      const result = await converter.convert(TEST_VIDEO, outputPath, OutputFormat.AVI_MJPEG, { quality: 5 });

      expect(result.success).toBe(true);
      expect(existsSync(outputPath)).toBe(true);
      expect(statSync(outputPath).size).toBeGreaterThan(0);

      // 验证 RIFF 头
      const data = readFileSync(outputPath);
      const riff = data.subarray(0, 4).toString('ascii');
      expect(riff).toBe('RIFF');

      console.log(`  AVI-MJPEG: ${statSync(outputPath).size} 字节`);
    });

    it('convert - H264 格式', async () => {
      const converter = new VideoConverter();
      const outputPath = join(tmpDir, 'output.h264');

      const result = await converter.convert(TEST_VIDEO, outputPath, OutputFormat.H264, { quality: 23 });

      expect(result.success).toBe(true);
      expect(existsSync(outputPath)).toBe(true);
      // H264 文件应大于 32 字节（自定义头部）
      expect(statSync(outputPath).size).toBeGreaterThan(32);

      console.log(`  H264: ${statSync(outputPath).size} 字节`);
    });

    it('convert - 指定帧率', async () => {
      const converter = new VideoConverter();
      const outputPath = join(tmpDir, 'output_fps.avi');

      const result = await converter.convert(TEST_VIDEO, outputPath, OutputFormat.AVI_MJPEG, {
        frameRate: 10,
        quality: 10,
      });

      expect(result.success).toBe(true);
      expect(Math.abs(result.frameRate - 10)).toBeLessThan(0.5);

      console.log(`  指定帧率: ${result.frameRate}fps`);
    });

    it('convert - 无效输入文件', async () => {
      const converter = new VideoConverter();

      await expect(
        converter.convert('nonexistent.mp4', join(tmpDir, 'out.avi'), OutputFormat.AVI_MJPEG)
      ).rejects.toThrow();
    });

    // ── Scaling (pre-processing) tests ──────────────────────────────────

    it('VideoScaler - 独立缩放 API（仅指定宽度）', async () => {
      const scaler = new VideoScaler();
      const outputPath = join(tmpDir, 'scaled_width.mp4');

      await scaler.scale(TEST_VIDEO, outputPath, { width: 320 });

      expect(existsSync(outputPath)).toBe(true);
      expect(statSync(outputPath).size).toBeGreaterThan(0);

      // Verify dimensions via ffprobe
      const info = await new VideoConverter().getVideoInfo(outputPath);
      expect(info.width).toBe(320);
      // Height is auto-calculated (even number, aspect ratio preserved)
      expect(info.height).toBeGreaterThan(0);
      expect(info.height % 2).toBe(0);

      console.log(`  缩放 (宽=320): ${info.width}x${info.height}`);
    });

    it('VideoScaler - 独立缩放 API（仅指定高度）', async () => {
      const scaler = new VideoScaler();
      const outputPath = join(tmpDir, 'scaled_height.mp4');

      await scaler.scale(TEST_VIDEO, outputPath, { height: 180 });

      expect(existsSync(outputPath)).toBe(true);
      const info = await new VideoConverter().getVideoInfo(outputPath);
      expect(info.height).toBe(180);
      expect(info.width).toBeGreaterThan(0);
      expect(info.width % 2).toBe(0);

      console.log(`  缩放 (高=180): ${info.width}x${info.height}`);
    });

    it('VideoScaler - 独立缩放 API（同时指定宽高）', async () => {
      const scaler = new VideoScaler();
      const outputPath = join(tmpDir, 'scaled_exact.mp4');

      await scaler.scale(TEST_VIDEO, outputPath, { width: 320, height: 240 });

      expect(existsSync(outputPath)).toBe(true);
      const info = await new VideoConverter().getVideoInfo(outputPath);
      expect(info.width).toBe(320);
      expect(info.height).toBe(240);

      console.log(`  缩放 (精确 320x240): ${info.width}x${info.height}`);
    });

    it('convert - 缩放后转换为 AVI-MJPEG', async () => {
      const converter = new VideoConverter();
      const outputPath = join(tmpDir, 'output_scaled.avi');

      const result = await converter.convert(TEST_VIDEO, outputPath, OutputFormat.AVI_MJPEG, {
        quality: 5,
        scale: { width: 320 },
      });

      expect(result.success).toBe(true);
      expect(result.inputPath).toBe(TEST_VIDEO); // original path preserved
      expect(existsSync(outputPath)).toBe(true);

      // Verify RIFF header
      const data = readFileSync(outputPath);
      expect(data.subarray(0, 4).toString('ascii')).toBe('RIFF');

      // Verify output resolution matches scale target
      const info = await converter.getVideoInfo(outputPath);
      expect(info.width).toBe(320);

      console.log(`  缩放后 AVI-MJPEG: ${info.width}x${info.height}, ${statSync(outputPath).size} 字节`);
    });

    it('convert - 缩放后转换为 MJPEG', async () => {
      const converter = new VideoConverter();
      const outputPath = join(tmpDir, 'output_scaled.mjpeg');

      const result = await converter.convert(TEST_VIDEO, outputPath, OutputFormat.MJPEG, {
        quality: 5,
        scale: { width: 320, height: 240 },
      });

      expect(result.success).toBe(true);
      expect(existsSync(outputPath)).toBe(true);
      const data = readFileSync(outputPath);
      expect(data[0]).toBe(0xff);
      expect(data[1]).toBe(0xd8);

      console.log(`  缩放后 MJPEG: ${statSync(outputPath).size} 字节`);
    });

    // ── Cropping (pre-processing) tests ─────────────────────────────────

    it('VideoCropper - 独立裁剪 API（居中裁剪）', async () => {
      const cropper = new VideoCropper();
      const outputPath = join(tmpDir, 'cropped_center.mp4');

      await cropper.crop(TEST_VIDEO, outputPath, { width: 320, height: 180 });

      expect(existsSync(outputPath)).toBe(true);
      expect(statSync(outputPath).size).toBeGreaterThan(0);

      const info = await new VideoConverter().getVideoInfo(outputPath);
      expect(info.width).toBe(320);
      expect(info.height).toBe(180);

      console.log(`  裁剪 (居中 320x180): ${info.width}x${info.height}`);
    });

    it('VideoCropper - 独立裁剪 API（指定位置）', async () => {
      const cropper = new VideoCropper();
      const outputPath = join(tmpDir, 'cropped_offset.mp4');

      await cropper.crop(TEST_VIDEO, outputPath, { width: 320, height: 180, x: 0, y: 0 });

      expect(existsSync(outputPath)).toBe(true);
      const info = await new VideoConverter().getVideoInfo(outputPath);
      expect(info.width).toBe(320);
      expect(info.height).toBe(180);

      console.log(`  裁剪 (左上角 320x180): ${info.width}x${info.height}`);
    });

    it('convert - 使用 preprocess 裁剪后转换为 AVI-MJPEG', async () => {
      const converter = new VideoConverter();
      const outputPath = join(tmpDir, 'output_cropped.avi');

      const result = await converter.convert(TEST_VIDEO, outputPath, OutputFormat.AVI_MJPEG, {
        quality: 5,
        preprocess: [{ type: 'crop', options: { width: 320, height: 180 } }],
      });

      expect(result.success).toBe(true);
      expect(result.inputPath).toBe(TEST_VIDEO);
      expect(existsSync(outputPath)).toBe(true);

      const data = readFileSync(outputPath);
      expect(data.subarray(0, 4).toString('ascii')).toBe('RIFF');

      const info = await converter.getVideoInfo(outputPath);
      expect(info.width).toBe(320);
      expect(info.height).toBe(180);

      console.log(`  裁剪后 AVI-MJPEG: ${info.width}x${info.height}, ${statSync(outputPath).size} 字节`);
    });

    it('convert - 先缩放再裁剪（preprocess pipeline）', async () => {
      const converter = new VideoConverter();
      const outputPath = join(tmpDir, 'output_scale_crop.avi');

      const result = await converter.convert(TEST_VIDEO, outputPath, OutputFormat.AVI_MJPEG, {
        quality: 5,
        preprocess: [
          { type: 'scale', options: { width: 640 } },
          { type: 'crop',  options: { width: 320, height: 180 } },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.inputPath).toBe(TEST_VIDEO);
      expect(existsSync(outputPath)).toBe(true);

      const info = await converter.getVideoInfo(outputPath);
      expect(info.width).toBe(320);
      expect(info.height).toBe(180);

      console.log(`  先缩放再裁剪 AVI-MJPEG: ${info.width}x${info.height}`);
    });

    it('convert - 先裁剪再缩放（preprocess pipeline 反序）', async () => {
      const converter = new VideoConverter();
      const outputPath = join(tmpDir, 'output_crop_scale.avi');

      const result = await converter.convert(TEST_VIDEO, outputPath, OutputFormat.AVI_MJPEG, {
        quality: 5,
        preprocess: [
          { type: 'crop',  options: { width: 320, height: 180 } },
          { type: 'scale', options: { width: 160 } },
        ],
      });

      expect(result.success).toBe(true);
      expect(existsSync(outputPath)).toBe(true);

      const info = await converter.getVideoInfo(outputPath);
      expect(info.width).toBe(160);

      console.log(`  先裁剪再缩放 AVI-MJPEG: ${info.width}x${info.height}`);
    });

    it('convert - preprocess 优先于 scale 字段', async () => {
      const converter = new VideoConverter();
      const outputPath = join(tmpDir, 'output_preprocess_priority.avi');

      // preprocess should take precedence over scale
      const result = await converter.convert(TEST_VIDEO, outputPath, OutputFormat.AVI_MJPEG, {
        quality: 5,
        scale: { width: 640 },                                          // should be ignored
        preprocess: [{ type: 'crop', options: { width: 320, height: 180 } }],
      });

      expect(result.success).toBe(true);
      const info = await converter.getVideoInfo(outputPath);
      // If preprocess wins: 320x180 (crop); if scale wins: 640 wide
      expect(info.width).toBe(320);
      expect(info.height).toBe(180);

      console.log(`  preprocess 优先: ${info.width}x${info.height}`);
    });
  }
);
