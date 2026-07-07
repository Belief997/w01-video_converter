/**
 * image-to-jpeg-converter 功能测试
 *
 * 端到端测试，验证实际 FFmpeg 转换流程及二进制头部格式正确性。
 * 运行前请确保：
 *   1. FFmpeg 已安装（ffmpeg -version）
 *   2. 测试图片存在：../../../test_image/ac_cold.png（相对于本文件）
 *
 * 运行方式（在 image-to-jpeg-converter/ 目录下）：
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

// 测试图片路径（相对于仓库根目录）
const REPO_ROOT = join(__dirname, '..', '..', '..');
const TEST_IMAGE = join(REPO_ROOT, 'test_image', 'ac_cold.png');

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
const imageExists = existsSync(TEST_IMAGE);
const canRun = ffmpegAvailable && imageExists;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let convertToJpeg: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let SamplingFactor: any;

beforeAll(async () => {
  if (canRun) {
    const mod = await import('../../src/index.js');
    convertToJpeg = mod.convertToJpeg;
    SamplingFactor = mod.SamplingFactor;
  }
});

describe.skipIf(!canRun)(
  `图片转换器功能测试${!ffmpegAvailable ? ' [跳过: FFmpeg 未安装]' : ''}${!imageExists ? ` [跳过: 测试图片不存在 ${TEST_IMAGE}]` : ''}`,
  () => {
    let tmpDir: string;

    beforeAll(() => {
      tmpDir = mkdtempSync(join(tmpdir(), 'img-test-'));
    });

    afterAll(() => {
      rmSync(tmpDir, { recursive: true, force: true });
    });

    it('基本转换 (4:2:0, 质量 5)', async () => {
      const outputPath = join(tmpDir, 'output_420.bin');

      await convertToJpeg({
        inputPath: TEST_IMAGE,
        outputPath,
        samplingFactor: SamplingFactor.YUV420,
        quality: 5,
      });

      expect(existsSync(outputPath)).toBe(true);
      expect(statSync(outputPath).size).toBeGreaterThan(16);

      // 验证 JPEG 数据从偏移 16 开始（0xFFD8）
      const data = readFileSync(outputPath);
      expect(data[16]).toBe(0xff);
      expect(data[17]).toBe(0xd8);

      console.log(`  420 输出: ${statSync(outputPath).size} 字节`);
    });

    it('高质量转换 (4:4:4, 质量 2)', async () => {
      const outputPath = join(tmpDir, 'output_444.bin');

      await convertToJpeg({
        inputPath: TEST_IMAGE,
        outputPath,
        samplingFactor: SamplingFactor.YUV444,
        quality: 2,
      });

      expect(existsSync(outputPath)).toBe(true);
      expect(statSync(outputPath).size).toBeGreaterThan(16);

      console.log(`  444 输出: ${statSync(outputPath).size} 字节`);
    });

    it('灰度转换 (4:0:0, 质量 10)', async () => {
      const outputPath = join(tmpDir, 'output_400.bin');

      await convertToJpeg({
        inputPath: TEST_IMAGE,
        outputPath,
        samplingFactor: SamplingFactor.Grayscale,
        quality: 10,
      });

      expect(existsSync(outputPath)).toBe(true);
      expect(statSync(outputPath).size).toBeGreaterThan(16);

      console.log(`  400 输出: ${statSync(outputPath).size} 字节`);
    });

    it('头部 spec v4 合规验证', async () => {
      const outputPath = join(tmpDir, 'output_spec.bin');

      await convertToJpeg({
        inputPath: TEST_IMAGE,
        outputPath,
        samplingFactor: SamplingFactor.YUV420,
        quality: 5,
      });

      const data = readFileSync(outputPath);

      // 字节 0：所有位字段为 0
      expect(data[0]).toBe(0x00);

      // 字节 1：type = 12（JPEG）
      expect(data[1]).toBe(0x0c);

      // 字节 2-3：宽度（uint16 LE）> 0
      const width = data.readUInt16LE(2);
      expect(width).toBeGreaterThan(0);

      // 字节 4-5：高度（uint16 LE）> 0
      const height = data.readUInt16LE(4);
      expect(height).toBeGreaterThan(0);

      // 字节 6：version = 0
      expect(data[6]).toBe(0x00);

      // 字节 7：rsvd2 = 0
      expect(data[7]).toBe(0x00);

      console.log(`  头部验证: ${width}x${height}, type=0x${data[1].toString(16).padStart(2, '0')}`);
    });

    it('JPEG size 字段验证', async () => {
      const outputPath = join(tmpDir, 'output_size.bin');

      await convertToJpeg({
        inputPath: TEST_IMAGE,
        outputPath,
        samplingFactor: SamplingFactor.YUV420,
        quality: 5,
      });

      const data = readFileSync(outputPath);

      // 字节 8-11：size = 实际 JPEG 数据大小
      const size = data.readUInt32LE(8);
      const actualJpegSize = data.length - 16;

      expect(size).toBe(actualJpegSize);
      expect(size).toBeGreaterThan(0);

      console.log(`  size 字段: ${size} = 实际 JPEG 大小 ${actualJpegSize}`);
    });

    it('dummy 字段验证', async () => {
      const outputPath = join(tmpDir, 'output_dummy.bin');

      await convertToJpeg({
        inputPath: TEST_IMAGE,
        outputPath,
        samplingFactor: SamplingFactor.YUV420,
        quality: 5,
      });

      const data = readFileSync(outputPath);

      // 字节 12-15：dummy = 0
      const dummy = data.readUInt32LE(12);
      expect(dummy).toBe(0);
    });

    it('无效输入文件处理', async () => {
      await expect(
        convertToJpeg({
          inputPath: 'nonexistent_image.png',
          outputPath: join(tmpDir, 'should_not_exist.bin'),
          samplingFactor: SamplingFactor.YUV420,
          quality: 5,
        })
      ).rejects.toThrow();
    });
  }
);
