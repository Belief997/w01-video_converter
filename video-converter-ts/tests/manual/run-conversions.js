/**
 * 人工测试脚本 — video-converter-ts
 *
 * 将测试视频转换为各种格式，输出到 test-output/ 目录，供人工校验。
 * 每次运行前会**清理** test-output/ 目录中的历史输出，确保结果干净。
 *
 * 运行方式（在 video-converter-ts/ 目录下）：
 *   npm run manual-test
 *   或
 *   node tests/manual/run-conversions.js [input.mp4]
 *
 * 测试内容：
 *   [VideoScaler 独立缩放]
 *   - birds_scaled_w320.mp4       → 缩小：宽度 320px，高度自动保持宽高比（偶数）
 *   - birds_scaled_h180.mp4       → 缩小：高度 180px，宽度自动保持宽高比（偶数）
 *   - birds_scaled_320x240.mp4    → 缩小：精确 320×240（可能改变宽高比）
 *   - birds_scaled_w1280.mp4      → 放大：宽度 1280px，高度自动保持宽高比
 *   - birds_scaled_1920x1080.mp4  → 放大：精确 1920×1080
 *
 *   [VideoCropper 独立裁剪]
 *   - birds_cropped_center.mp4    → 居中裁剪 320×180（FFmpeg 自动计算偏移）
 *   - birds_cropped_offset.mp4    → 从左上角(0,0)裁剪 320×180
 *
 *   [VideoConverter 转换（原始尺寸）]
 *   - birds.avi                   → AVI-MJPEG，默认质量
 *   - birds_hq.avi                → AVI-MJPEG，高质量（q=1）
 *   - birds_15fps.avi             → AVI-MJPEG，限速 15fps
 *   - birds.mjpeg                 → MJPEG 裸流
 *   - birds.h264                  → H264 + 自定义 32 字节头
 *
 *   [VideoConverter 转换（缩放后，scale 字段向后兼容）]
 *   - birds_scaled_w320.avi       → 缩小 320px 宽，再转 AVI-MJPEG
 *   - birds_scaled_320x240.avi    → 缩小至 320×240，再转 AVI-MJPEG
 *   - birds_scaled_w320.mjpeg     → 缩小 320px 宽，再转 MJPEG 裸流
 *   - birds_scaled_w320.h264      → 缩小 320px 宽，再转 H264
 *   - birds_scaled_w1280.avi      → 放大 1280px 宽，再转 AVI-MJPEG
 *
 *   [VideoConverter 转换（preprocess pipeline）]
 *   - birds_crop320x180.avi       → 仅裁剪 320×180，再转 AVI-MJPEG
 *   - birds_scale_crop.avi        → 先缩放到 400px 宽，再裁剪 320×180，转 AVI-MJPEG
 *   - birds_crop_scale.avi        → 先裁剪 320×180，再缩放到 160px 宽，转 AVI-MJPEG
 *
 * 验证方法（运行结束后）：
 *   ffplay  test-output/birds.avi                  # 原始 AVI 播放
 *   ffplay  test-output/birds_scaled_w320.avi      # 缩小后 AVI（分辨率应更小）
 *   ffplay  test-output/birds_crop320x180.avi      # 裁剪后 AVI
 *   ffplay  test-output/birds_scale_crop.avi       # 先缩放再裁剪后 AVI
 *   ffprobe test-output/birds_scaled_w1280.mp4     # 检查放大后分辨率
 *   ffprobe test-output/birds_cropped_center.mp4   # 检查居中裁剪分辨率
 */

import { VideoConverter, VideoScaler, VideoCropper, OutputFormat } from '../../dist/index.js';
import { existsSync, mkdirSync, statSync } from 'fs';
import { join, dirname, basename, extname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODULE_ROOT = join(__dirname, '..', '..');
const REPO_ROOT = join(MODULE_ROOT, '..');
const OUTPUT_DIR = join(MODULE_ROOT, 'test-output');

const inputPath = process.argv[2] ?? join(REPO_ROOT, 'test_video', 'birds.mp4');
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
  console.error('用法: node tests/manual/run-conversions.js [input.mp4]');
  process.exit(1);
}

// ─── 清理历史输出 ──────────────────────────────────────────────────────────
if (existsSync(OUTPUT_DIR)) {
  // 只清理目录内的文件（避免 Windows 目录句柄占用导致删目录失败）
  const { readdirSync, unlinkSync } = await import('fs');
  for (const f of readdirSync(OUTPUT_DIR)) {
    try { unlinkSync(join(OUTPUT_DIR, f)); } catch { /* ignore locked files */ }
  }
  console.log(`🧹 已清理历史输出: ${OUTPUT_DIR}`);
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

// ─── 独立缩放任务（VideoScaler 单独 API）─────────────────────────────────
async function runScalerTasks() {
  console.log('');
  console.log('📐  VideoScaler 独立缩放测试');
  printSep();

  const scalerTasks = [
    {
      label: '缩小 — 仅指定宽度 320px（保持宽高比）',
      outputFile: `${inputName}_scaled_w320.mp4`,
      options: { width: 320 },
    },
    {
      label: '缩小 — 仅指定高度 180px（保持宽高比）',
      outputFile: `${inputName}_scaled_h180.mp4`,
      options: { height: 180 },
    },
    {
      label: '缩小 — 精确尺寸 320×240',
      outputFile: `${inputName}_scaled_320x240.mp4`,
      options: { width: 320, height: 240 },
    },
    {
      label: '放大 — 仅指定宽度 1280px（保持宽高比）',
      outputFile: `${inputName}_scaled_w1280.mp4`,
      options: { width: 1280 },
    },
    {
      label: '放大 — 精确尺寸 1920×1080',
      outputFile: `${inputName}_scaled_1920x1080.mp4`,
      options: { width: 1920, height: 1080 },
    },
  ];

  const scalerResults = [];
  for (const task of scalerTasks) {
    const outputPath = join(OUTPUT_DIR, task.outputFile);
    process.stdout.write(`  ⏳ ${task.label} ...`);
    const start = Date.now();
    try {
      const scaler = new VideoScaler((c, t) => {});
      await scaler.scale(inputPath, outputPath, task.options);
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      const size = existsSync(outputPath) ? statSync(outputPath).size : 0;
      console.log(`  ✅ 完成 (${elapsed}s, ${formatBytes(size)})`);
      scalerResults.push({ label: task.label, file: task.outputFile, success: true, size, elapsed });
    } catch (err) {
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`  ❌ 失败 (${elapsed}s): ${err.message}`);
      scalerResults.push({ label: task.label, file: task.outputFile, success: false, error: err.message });
    }
  }
  return scalerResults;
}

// ─── 独立裁剪任务（VideoCropper 单独 API）─────────────────────────────────
async function runCropperTasks() {
  console.log('');
  console.log('✂️   VideoCropper 独立裁剪测试');
  printSep();

  const cropperTasks = [
    {
      label: '居中裁剪 320×180（FFmpeg 自动计算偏移）',
      outputFile: `${inputName}_cropped_center.mp4`,
      options: { width: 320, height: 180 },
    },
    {
      label: '左上角(0,0)裁剪 320×180',
      outputFile: `${inputName}_cropped_offset.mp4`,
      options: { width: 320, height: 180, x: 0, y: 0 },
    },
  ];

  const cropperResults = [];
  for (const task of cropperTasks) {
    const outputPath = join(OUTPUT_DIR, task.outputFile);
    process.stdout.write(`  ⏳ ${task.label} ...`);
    const start = Date.now();
    try {
      const cropper = new VideoCropper((c, t) => {});
      await cropper.crop(inputPath, outputPath, task.options);
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      const size = existsSync(outputPath) ? statSync(outputPath).size : 0;
      console.log(`  ✅ 完成 (${elapsed}s, ${formatBytes(size)})`);
      cropperResults.push({ label: task.label, file: task.outputFile, success: true, size, elapsed });
    } catch (err) {
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`  ❌ 失败 (${elapsed}s): ${err.message}`);
      cropperResults.push({ label: task.label, file: task.outputFile, success: false, error: err.message });
    }
  }
  return cropperResults;
}
const tasks = [
  {
    label: 'AVI-MJPEG（默认质量）',
    outputFile: `${inputName}.avi`,
    format: OutputFormat.AVI_MJPEG,
    options: {},
  },
  {
    label: 'AVI-MJPEG（高质量 q=1）',
    outputFile: `${inputName}_hq.avi`,
    format: OutputFormat.AVI_MJPEG,
    options: { quality: 1 },
  },
  {
    label: 'AVI-MJPEG（限速 15fps）',
    outputFile: `${inputName}_15fps.avi`,
    format: OutputFormat.AVI_MJPEG,
    options: { frameRate: 15 },
  },
  {
    label: 'MJPEG 裸流',
    outputFile: `${inputName}.mjpeg`,
    format: OutputFormat.MJPEG,
    options: {},
  },
  {
    label: 'H264',
    outputFile: `${inputName}.h264`,
    format: OutputFormat.H264,
    options: {},
  },
  // ── Scale + convert tasks ──────────────────────────────────────────────
  {
    label: 'AVI-MJPEG（缩放 320px 宽，保持宽高比）',
    outputFile: `${inputName}_scaled_w320.avi`,
    format: OutputFormat.AVI_MJPEG,
    options: { scale: { width: 320 } },
  },
  {
    label: 'AVI-MJPEG（缩放精确 320×240）',
    outputFile: `${inputName}_scaled_320x240.avi`,
    format: OutputFormat.AVI_MJPEG,
    options: { scale: { width: 320, height: 240 } },
  },
  {
    label: 'MJPEG（缩放 320px 宽）',
    outputFile: `${inputName}_scaled_w320.mjpeg`,
    format: OutputFormat.MJPEG,
    options: { scale: { width: 320 } },
  },
  {
    label: 'H264（缩放 320px 宽，保持宽高比）',
    outputFile: `${inputName}_scaled_w320.h264`,
    format: OutputFormat.H264,
    options: { scale: { width: 320 } },
  },
  {
    label: 'AVI-MJPEG（放大 1280px 宽，保持宽高比）',
    outputFile: `${inputName}_scaled_w1280.avi`,
    format: OutputFormat.AVI_MJPEG,
    options: { scale: { width: 1280 } },
  },
  // ── Preprocess pipeline tasks ──────────────────────────────────────────
  {
    label: 'AVI-MJPEG（仅裁剪 320×180，preprocess 单步）',
    outputFile: `${inputName}_crop320x180.avi`,
    format: OutputFormat.AVI_MJPEG,
    options: { preprocess: [{ type: 'crop', options: { width: 320, height: 180 } }] },
  },
  {
    label: 'AVI-MJPEG（先缩放 400px 宽，再裁剪 320×180）',
    outputFile: `${inputName}_scale_crop.avi`,
    format: OutputFormat.AVI_MJPEG,
    options: {
      preprocess: [
        { type: 'scale', options: { width: 400 } },
        { type: 'crop',  options: { width: 320, height: 180 } },
      ],
    },
  },
  {
    label: 'AVI-MJPEG（先裁剪 320×180，再缩放 160px 宽）',
    outputFile: `${inputName}_crop_scale.avi`,
    format: OutputFormat.AVI_MJPEG,
    options: {
      preprocess: [
        { type: 'crop',  options: { width: 320, height: 180 } },
        { type: 'scale', options: { width: 160 } },
      ],
    },
  },
];

// ─── 主流程 ───────────────────────────────────────────────────────────────
console.log('');
console.log('🎬  video-converter-ts 人工测试');
printSep();
console.log(`输入:  ${inputPath}`);
console.log(`输出:  ${OUTPUT_DIR}`);
printSep();

const inputSize = statSync(inputPath).size;
console.log(`输入大小: ${formatBytes(inputSize)}`);

// Run standalone scaler tasks first
const scalerResults = await runScalerTasks();

// Run standalone cropper tasks
const cropperResults = await runCropperTasks();

// ─── 转换任务 ─────────────────────────────────────────────────────────────
console.log('');
console.log('🔄  视频转换测试（含 scale/crop preprocess 组合任务）');
printSep();

const results = [];

for (const task of tasks) {
  const outputPath = join(OUTPUT_DIR, task.outputFile);
  process.stdout.write(`  ⏳ ${task.label} ...`);

  const startTime = Date.now();
  try {
    let lastProgress = 0;
    const converter = new VideoConverter((current, total) => {
      const pct = total > 0 ? Math.floor((current / total) * 100) : 0;
      if (pct - lastProgress >= 20) {
        process.stdout.write(` ${pct}%`);
        lastProgress = pct;
      }
    });

    await converter.convert(inputPath, outputPath, task.format, task.options);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const outSize = existsSync(outputPath) ? statSync(outputPath).size : 0;

    console.log(`  ✅ 完成 (${elapsed}s, ${formatBytes(outSize)})`);
    results.push({ label: task.label, file: task.outputFile, success: true, size: outSize, elapsed });
  } catch (err) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`  ❌ 失败 (${elapsed}s): ${err.message}`);
    results.push({ label: task.label, file: task.outputFile, success: false, error: err.message });
  }
}

// ─── 汇总 ─────────────────────────────────────────────────────────────────
console.log('');
printSep();
console.log('📊  汇总');
printSep();

console.log('  [缩放器]');
for (const r of scalerResults) {
  const status = r.success ? '✅' : '❌';
  const detail = r.success ? `${formatBytes(r.size)} (${r.elapsed}s)` : r.error;
  console.log(`  ${status} ${r.file.padEnd(40)} ${detail}`);
}
console.log('');
console.log('  [裁剪器]');
for (const r of cropperResults) {
  const status = r.success ? '✅' : '❌';
  const detail = r.success ? `${formatBytes(r.size)} (${r.elapsed}s)` : r.error;
  console.log(`  ${status} ${r.file.padEnd(40)} ${detail}`);
}
console.log('');
console.log('  [转换器]');
for (const r of results) {
  const status = r.success ? '✅' : '❌';
  const detail = r.success ? `${formatBytes(r.size)} (${r.elapsed}s)` : r.error;
  console.log(`  ${status} ${r.file.padEnd(40)} ${detail}`);
}
printSep();

console.log('');
console.log('🔍  请在以下目录中手动验证输出:');
console.log(`   ${OUTPUT_DIR}`);
console.log('');
console.log('   验证方法:');
console.log('   ffplay  test-output/birds.avi                  # AVI 播放');
console.log('   ffplay  test-output/birds_scaled_w320.avi      # 缩放后 AVI 播放');
console.log('   ffplay  test-output/birds_crop320x180.avi      # 裁剪后 AVI 播放');
console.log('   ffplay  test-output/birds_scale_crop.avi       # 先缩放再裁剪 AVI 播放');
console.log('   ffprobe test-output/birds_scaled_w320.mp4      # 检查缩放后分辨率');
console.log('   ffprobe test-output/birds_cropped_center.mp4   # 检查居中裁剪分辨率');
console.log('   ffprobe test-output/birds_scaled_w320.avi      # 检查缩放+转换后分辨率');
console.log('');

const allResults = [...scalerResults, ...cropperResults, ...results];
const failed = allResults.filter(r => !r.success).length;
process.exit(failed > 0 ? 1 : 0);
