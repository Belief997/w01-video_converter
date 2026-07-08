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

/**
 * 从 JPEG 负载中解析 SOF0 (0xFFC0) 标记里的实际编码宽高。
 * SOF 结构：FF C0 | len(2) | precision(1) | height(2, BE) | width(2, BE)。
 * @param data 完整输出文件（含 16 字节自定义头）
 * @param start JPEG 数据起始偏移（本项目固定为 16）
 */
function readSofDimensions(
  data: Buffer,
  start: number
): { width: number; height: number } | null {
  for (let i = start; i < data.length - 9; i++) {
    if (data[i] === 0xff && data[i + 1] === 0xc0) {
      const height = data.readUInt16BE(i + 5);
      const width = data.readUInt16BE(i + 7);
      return { width, height };
    }
  }
  return null;
}

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

    it('MCU 对齐：GUI 头部保持原始宽高，JPEG SOF 使用对齐后宽高 (4:2:0)', async () => {
      const outputPath = join(tmpDir, 'output_align.bin');

      const result = await convertToJpeg({
        inputPath: TEST_IMAGE,
        outputPath,
        samplingFactor: SamplingFactor.YUV420,
        quality: 5,
        align: true,
      });

      const data = readFileSync(outputPath);

      // result.dimensions = 原始（逻辑）尺寸；此处为测试图 686x686
      const origW = result.dimensions.width;
      const origH = result.dimensions.height;

      // 420 → MCU 16x16，宽高各向上取整到 16 的倍数
      const expectedW = Math.ceil(origW / 16) * 16;
      const expectedH = Math.ceil(origH / 16) * 16;

      // 该测试图必须触发对齐（否则本用例无意义）
      expect(expectedW !== origW || expectedH !== origH).toBe(true);

      // result 同时报告编码尺寸
      expect(result.encodedDimensions).toEqual({
        width: expectedW,
        height: expectedH,
      });

      // GUI 头部（字节 2-5）保持原始宽高
      expect(data.readUInt16LE(2)).toBe(origW);
      expect(data.readUInt16LE(4)).toBe(origH);

      // 位字段仍为 0（严格 spec_v4 合规，align 位不置位）
      expect(data[0]).toBe(0x00);

      // JPEG SOF（负载内）使用对齐后宽高
      const sof = readSofDimensions(data, 16);
      expect(sof).not.toBeNull();
      expect(sof).toEqual({ width: expectedW, height: expectedH });

      console.log(
        `  对齐: GUI=${origW}x${origH}, SOF=${sof!.width}x${sof!.height}`
      );
    });

    it('未开启对齐时：GUI 头部与 JPEG SOF 宽高一致，且无 encodedDimensions', async () => {
      const outputPath = join(tmpDir, 'output_noalign.bin');

      const result = await convertToJpeg({
        inputPath: TEST_IMAGE,
        outputPath,
        samplingFactor: SamplingFactor.YUV420,
        quality: 5,
      });

      const data = readFileSync(outputPath);

      // 默认路径不报告 encodedDimensions
      expect(result.encodedDimensions).toBeUndefined();

      // GUI 头部与 SOF 一致
      const guiW = data.readUInt16LE(2);
      const guiH = data.readUInt16LE(4);
      const sof = readSofDimensions(data, 16);
      expect(sof).not.toBeNull();
      expect(sof).toEqual({ width: guiW, height: guiH });
    });

    it('最小尺寸 padding（align 关）：SOF = 精确内容尺寸 max(原始, min)，不取整到 MCU，GUI 头部保持原始 (4:2:0)', async () => {
      const outputPath = join(tmpDir, 'output_min.bin');

      // 该测试图为 686x686；取大于它的 min 以强制 padding。
      // 刻意使用「大于原始、非 16 倍数、但为偶数」的 min（4:2:0 要求偶数宽高）：
      // align 关时，SOF 应等于 min 本身，而不是向上取整到 MCU。
      const minWidth = 810; // 非 16 倍数（816 才是），align 关 → SOF=810
      const minHeight = 700; // 非 16 倍数（704 才是），align 关 → SOF=700

      const result = await convertToJpeg({
        inputPath: TEST_IMAGE,
        outputPath,
        samplingFactor: SamplingFactor.YUV420,
        quality: 5,
        // 注意：未开启 align，min 单独即可触发 padding
        minWidth,
        minHeight,
      });

      const data = readFileSync(outputPath);

      const origW = result.dimensions.width;
      const origH = result.dimensions.height;

      // align 关：SOF = max(原始, min)，不做 MCU 取整
      const expectedW = Math.max(origW, minWidth); // 810
      const expectedH = Math.max(origH, minHeight); // 700

      // min 必须大于原始尺寸（否则本用例无意义）
      expect(expectedW).toBeGreaterThan(origW);
      expect(expectedH).toBeGreaterThan(origH);
      // 且刻意选用非 MCU 倍数，验证「align 关不取整」
      expect(expectedW % 16).not.toBe(0);
      expect(expectedH % 16).not.toBe(0);

      // result 报告编码尺寸（= 精确内容尺寸）
      expect(result.encodedDimensions).toEqual({
        width: expectedW,
        height: expectedH,
      });

      // GUI 头部（字节 2-5）保持原始宽高
      expect(data.readUInt16LE(2)).toBe(origW);
      expect(data.readUInt16LE(4)).toBe(origH);

      // 位字段仍为 0（严格 spec_v4 合规）
      expect(data[0]).toBe(0x00);

      // JPEG SOF（负载内）= 精确内容尺寸，非 MCU 对齐
      const sof = readSofDimensions(data, 16);
      expect(sof).not.toBeNull();
      expect(sof).toEqual({ width: expectedW, height: expectedH });

      console.log(
        `  最小尺寸(align 关): GUI=${origW}x${origH}, SOF=${sof!.width}x${sof!.height}`
      );
    });

    it('最小尺寸 padding + align：SOF = 向上取整到 MCU( max(原始, min) )，GUI 头部保持原始 (4:2:0)', async () => {
      const outputPath = join(tmpDir, 'output_min_align.bin');

      // 与上一用例相同的 min，但开启 align：SOF 应在内容尺寸基础上再取整到 MCU。
      const minWidth = 810; // → roundUp(810,16) = 816
      const minHeight = 700; // → roundUp(700,16) = 704

      const result = await convertToJpeg({
        inputPath: TEST_IMAGE,
        outputPath,
        samplingFactor: SamplingFactor.YUV420,
        quality: 5,
        align: true,
        minWidth,
        minHeight,
      });

      const data = readFileSync(outputPath);

      const origW = result.dimensions.width;
      const origH = result.dimensions.height;

      const mcu = 16;
      const roundUp = (v: number): number => Math.ceil(v / mcu) * mcu;
      const expectedW = roundUp(Math.max(origW, minWidth)); // 816
      const expectedH = roundUp(Math.max(origH, minHeight)); // 704

      expect(expectedW).toBeGreaterThan(origW);
      expect(expectedH).toBeGreaterThan(origH);

      // result 报告编码尺寸（= MCU 对齐后）
      expect(result.encodedDimensions).toEqual({
        width: expectedW,
        height: expectedH,
      });

      // GUI 头部保持原始宽高、位字段为 0
      expect(data.readUInt16LE(2)).toBe(origW);
      expect(data.readUInt16LE(4)).toBe(origH);
      expect(data[0]).toBe(0x00);

      // JPEG SOF = MCU 对齐后尺寸
      const sof = readSofDimensions(data, 16);
      expect(sof).not.toBeNull();
      expect(sof).toEqual({ width: expectedW, height: expectedH });

      console.log(
        `  最小尺寸(align 开): GUI=${origW}x${origH}, SOF=${sof!.width}x${sof!.height}`
      );
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
