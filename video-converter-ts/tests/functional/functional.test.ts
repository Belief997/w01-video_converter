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

import { describe, it, expect, beforeAll } from 'vitest';
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

beforeAll(async () => {
  if (canRun) {
    const mod = await import('../../src/index.js');
    VideoConverter = mod.VideoConverter;
    OutputFormat = mod.OutputFormat;
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
  }
);
