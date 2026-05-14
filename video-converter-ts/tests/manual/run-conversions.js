/**
 * 人工测试脚本 — video-converter-ts
 *
 * 将测试视频转换为各种格式，输出到 test-output/ 目录，供人工校验。
 *
 * 运行方式（在 video-converter-ts/ 目录下）：
 *   npm run manual-test
 *   或
 *   node tests/manual/run-conversions.js [input.mp4]
 *
 * 结束后请在 test-output/ 目录中手动验证转换输出：
 *   - birds.mjpeg   → 可用 ffplay / 视频播放器打开
 *   - birds.avi     → 可用 ffplay / 视频播放器打开（MJPEG in AVI）
 *   - birds_15fps.avi → 同上，帧率限制为 15fps
 *   - birds.h264    → 可用 ffplay birds.h264 打开
 */

import { VideoConverter, OutputFormat } from '../../dist/index.js';
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

// ─── 转换任务列表 ─────────────────────────────────────────────────────────
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
console.log('');

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
console.log('📊  转换汇总');
printSep();
for (const r of results) {
  const status = r.success ? '✅' : '❌';
  const detail = r.success ? `${formatBytes(r.size)} (${r.elapsed}s)` : r.error;
  console.log(`  ${status} ${r.file.padEnd(25)} ${detail}`);
}
printSep();

console.log('');
console.log('🔍  请在以下目录中手动验证输出:');
console.log(`   ${OUTPUT_DIR}`);
console.log('');
console.log('   验证方法:');
console.log('   ffplay test-output/birds.avi      # AVI 播放');
console.log('   ffplay test-output/birds.mjpeg    # MJPEG 播放');
console.log('   ffplay test-output/birds.h264     # H264 播放');
console.log('   ffprobe test-output/birds.avi     # 检查格式信息');
console.log('');

const failed = results.filter(r => !r.success).length;
process.exit(failed > 0 ? 1 : 0);
