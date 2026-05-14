/**
 * 人工测试脚本 — image-to-jpeg-converter
 *
 * 将测试图片转换为各种采样格式的 .bin 文件，输出到 test-output/ 目录，供人工校验。
 *
 * 运行方式（在 image-to-jpeg-converter/ 目录下）：
 *   npm run manual-test
 *   或
 *   node tests/manual/run-conversions.js [input.png]
 *
 * 结束后请在 test-output/ 目录中手动验证：
 *   - *.bin → 十六进制编辑器查看头部
 *   - *.jpg → 提取自 .bin 的 JPEG，可用图片查看器打开
 */

import { convertToJpeg, SamplingFactor } from '../../dist/index.js';
import { existsSync, mkdirSync, statSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname, basename, extname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODULE_ROOT = join(__dirname, '..', '..');
const REPO_ROOT = join(MODULE_ROOT, '..');
const OUTPUT_DIR = join(MODULE_ROOT, 'test-output');

const inputPath = process.argv[2] ?? join(REPO_ROOT, 'test_image', 'ac_cold.png');
const inputName = basename(inputPath, extname(inputPath));

// ─── 前置检查 ─────────────────────────────────────────────────────────────
function checkFFmpeg() {
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

if (!checkFFmpeg()) {
  console.error('❌ FFmpeg 未安装或不在 PATH 中');
  process.exit(1);
}

if (!existsSync(inputPath)) {
  console.error(`❌ 输入文件不存在: ${inputPath}`);
  console.error('用法: node tests/manual/run-conversions.js [input.png]');
  process.exit(1);
}

mkdirSync(OUTPUT_DIR, { recursive: true });

// ─── 工具函数 ─────────────────────────────────────────────────────────────
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function printSep() {
  console.log('─'.repeat(60));
}

function printBinHeader(filePath) {
  const data = readFileSync(filePath);
  const type = data[1];
  const width = data.readUInt16LE(2);
  const height = data.readUInt16LE(4);
  const version = data[6];
  const rsvd2 = data[7];
  const jpegSize = data.readUInt32LE(8);
  const dummy = data.readUInt32LE(12);
  const soi = data.slice(16, 18);
  console.log(`       头部: type=0x${type.toString(16).padStart(2,'0')} w=${width} h=${height} version=${version} rsvd2=${rsvd2}`);
  console.log(`              jpegSize=${jpegSize} dummy=${dummy} SOI=0x${soi.toString('hex').toUpperCase()}`);
}

// ─── 转换任务列表 ─────────────────────────────────────────────────────────
const tasks = [
  { label: 'YUV 4:2:0，质量 5', outputFile: `${inputName}_420_q5.bin`, samplingFactor: SamplingFactor.YUV420, quality: 5 },
  { label: 'YUV 4:2:0，质量 1（最高）', outputFile: `${inputName}_420_q1.bin`, samplingFactor: SamplingFactor.YUV420, quality: 1 },
  { label: 'YUV 4:2:0，质量 31（最低）', outputFile: `${inputName}_420_q31.bin`, samplingFactor: SamplingFactor.YUV420, quality: 31 },
  { label: 'YUV 4:4:4，质量 5', outputFile: `${inputName}_444_q5.bin`, samplingFactor: SamplingFactor.YUV444, quality: 5 },
  { label: 'YUV 4:2:2，质量 5', outputFile: `${inputName}_422_q5.bin`, samplingFactor: SamplingFactor.YUV422, quality: 5 },
  { label: '灰度（Grayscale），质量 5', outputFile: `${inputName}_gray_q5.bin`, samplingFactor: SamplingFactor.Grayscale, quality: 5 },
];

// ─── 主流程 ───────────────────────────────────────────────────────────────
console.log('');
console.log('🖼️   image-to-jpeg-converter 人工测试');
printSep();
console.log(`输入:  ${inputPath}`);
console.log(`输出:  ${OUTPUT_DIR}`);
printSep();
console.log(`输入大小: ${formatBytes(statSync(inputPath).size)}`);
console.log('');

const results = [];

for (const task of tasks) {
  const outputPath = join(OUTPUT_DIR, task.outputFile);
  process.stdout.write(`  ⏳ ${task.label} ...`);

  const startTime = Date.now();
  try {
    await convertToJpeg({ inputPath, outputPath, samplingFactor: task.samplingFactor, quality: task.quality });
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const outSize = existsSync(outputPath) ? statSync(outputPath).size : 0;

    console.log(`  ✅ 完成 (${elapsed}s, ${formatBytes(outSize)})`);
    printBinHeader(outputPath);
    results.push({ label: task.label, file: task.outputFile, success: true, size: outSize, elapsed });
  } catch (err) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`  ❌ 失败 (${elapsed}s): ${err.message}`);
    results.push({ label: task.label, file: task.outputFile, success: false, error: err.message });
  }
}

// ─── 提取 JPEG 供目视验证 ─────────────────────────────────────────────────
console.log('');
console.log('🔧  提取 JPEG 数据用于目视检查...');
for (const r of results.filter(r => r.success)) {
  const binPath = join(OUTPUT_DIR, r.file);
  const jpegPath = join(OUTPUT_DIR, r.file.replace('.bin', '.jpg'));
  const data = readFileSync(binPath);
  writeFileSync(jpegPath, data.slice(16));
  console.log(`  → ${r.file.replace('.bin', '.jpg')} (${formatBytes(data.length - 16)})`);
}

// ─── 汇总 ─────────────────────────────────────────────────────────────────
console.log('');
printSep();
console.log('📊  转换汇总');
printSep();
for (const r of results) {
  const status = r.success ? '✅' : '❌';
  const detail = r.success ? `${formatBytes(r.size)} (${r.elapsed}s)` : r.error;
  console.log(`  ${status} ${r.file.padEnd(30)} ${detail}`);
}
printSep();

console.log('');
console.log('🔍  请在以下目录中手动验证输出:');
console.log(`   ${OUTPUT_DIR}`);
console.log('');
console.log('   验证方法:');
console.log('   1. 用图片查看器打开 *.jpg 文件，确认图片内容正确、无色差/失真');
console.log('   2. 对比不同质量/采样下文件大小差异是否符合预期');
console.log('   3. 用十六进制编辑器验证 *.bin 头部格式（偏移 0=0x00, 1=0x0C, 16+=0xFFD8）');
console.log('');

const failed = results.filter(r => !r.success).length;
process.exit(failed > 0 ? 1 : 0);
