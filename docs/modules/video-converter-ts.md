# TypeScript 视频转换器

**路径：** `video-converter-ts/`  
**npm 包：** `@belief997/video-converter`  
**入口：** `node dist/cli.js` 或 `npx @belief997/video-converter`  
**依赖：** Node.js 18+、FFmpeg

---

## 功能

与 Python 版等价，将视频转换为：
- **MJPEG** — 连续 JPEG 帧流
- **AVI-MJPEG** — AVI 容器，帧数据 8 字节对齐
- **H264** — 带自定义 32 字节头部的 H264 裸流

---

## 安装与构建

```bash
cd video-converter-ts
npm install
npm run build   # 输出到 dist/
```

---

## CLI 用法

```bash
# 查看视频信息
node dist/cli.js --info -i ../test_video/birds.mp4

# 转换为 AVI-MJPEG
node dist/cli.js -i ../test_video/birds.mp4 -o output.avi -f avi_mjpeg -v

# 转换为 MJPEG
node dist/cli.js -i ../test_video/birds.mp4 -o output.mjpeg -f mjpeg

# 转换为 H264（CRF=23）
node dist/cli.js -i ../test_video/birds.mp4 -o output.h264 -f h264 -q 23
```

### 参数说明

| 参数 | 简写 | 说明 |
|------|------|------|
| `--input` | `-i` | 输入视频文件路径（必需） |
| `--output` | `-o` | 输出文件路径（必需） |
| `--format` | `-f` | `mjpeg` / `avi_mjpeg` / `h264`（必需） |
| `--fps` | `-r` | 目标帧率（可选） |
| `--quality` | `-q` | 质量参数（可选） |
| `--verbose` | `-v` | 显示详细信息 |
| `--debug` | `-d` | 调试模式（保留中间文件） |
| `--info` | | 仅显示视频信息 |

---

## API 用法

```typescript
import { VideoConverter, OutputFormat } from '@belief997/video-converter';

const converter = new VideoConverter((current, total) => {
  console.log(`进度: ${current}/${total}`);
});

// 获取视频信息
const info = await converter.getVideoInfo('input.mp4');

// 转换视频
const result = await converter.convert(
  'input.mp4',
  'output.avi',
  OutputFormat.AVI_MJPEG,
  { frameRate: 25, quality: 2, debug: false }
);
```

---

## 源码集成（无 npm）

将 `src/` 复制到你的项目中直接使用，零外部依赖：

```bash
cp -r video-converter-ts/src your-project/src/video-converter
```

详见 [`video-converter-ts/SOURCE_INTEGRATION.md`](../../video-converter-ts/SOURCE_INTEGRATION.md)。

---

## 模块结构

```
video-converter-ts/src/
├── cli.ts              # 命令行入口（Commander）
├── converter.ts        # VideoConverter 主类
├── parser.ts           # ffprobe 视频信息解析
├── ffmpeg-builder.ts   # FFmpeg 命令构建
├── ffmpeg-executor.ts  # 子进程执行 + 进度解析
├── models.ts           # 数据模型
├── errors.ts           # 错误类型
├── index.ts            # 模块导出
└── postprocess/
    ├── avi-aligner.ts  # AVI 8 字节对齐（纯 TypeScript 实现）
    ├── mjpeg-packer.ts # MJPEG 打包
    ├── h264-packer.ts  # H264 头部封装
    └── index.ts
```

---

## 测试

```bash
npm test
npm run test:coverage
```

测试文件位于 `tests/`，覆盖 parser、ffmpeg-builder、ffmpeg-executor、avi-aligner、mjpeg-packer、h264-packer。

---

## 调试模式

`-d` / `--debug` 保留 AVI-MJPEG 转换的中间文件，便于排查对齐问题：

| 文件 | 说明 |
|------|------|
| `output.ffmpeg.avi` | FFmpeg 直接输出 |
| `output.pass1.avi` | 第一步对齐后 |
| `output.avi` | 最终输出（全帧 8 字节对齐） |
