# 快速开始 - 5 分钟集成指南

## 1. 复制源码（30 秒）

将 `src/` 目录复制到你的项目：

```bash
# Linux/Mac
cp -r video-converter-ts/src/ your-project/src/video-converter/

# Windows
xcopy /E video-converter-ts\src\ your-project\src\video-converter\
```

> 确保包含 `preprocess/` 和 `postprocess/` 子目录。`cli.ts` 不需要复制。

## 2. 导入（10 秒）

```typescript
import { VideoConverter, VideoScaler, OutputFormat } from './video-converter';
```

## 3. 使用（3 分钟）

### 最简单的例子

```typescript
import { VideoConverter, OutputFormat } from './video-converter';

const converter = new VideoConverter();

await converter.convert(
  'input.mp4',            // 输入文件
  'output.avi',           // 输出文件
  OutputFormat.AVI_MJPEG  // 格式
);
```

### 带进度显示

```typescript
const converter = new VideoConverter((current, total) => {
  console.log(`进度: ${current}/${total}`);
});

await converter.convert('input.mp4', 'output.avi', OutputFormat.AVI_MJPEG);
```

### 转换前缩放

```typescript
const converter = new VideoConverter();

const result = await converter.convert(
  'input.mp4',
  'output.avi',
  OutputFormat.AVI_MJPEG,
  {
    frameRate: 25,          // 可选：目标帧率
    quality: 2,             // 可选：质量 (MJPEG: 1-31)
    scale: { width: 640 },  // 可选：先缩放至 640px 宽，高度自动保持宽高比
    debug: false            // 可选：调试模式（保留中间文件）
  }
);

console.log('转换完成:', result);
```

### 独立缩放（不转换格式）

```typescript
import { VideoScaler } from './video-converter';

const scaler = new VideoScaler();

// 仅指定宽度，高度自动保持宽高比
await scaler.scale('input.mp4', 'scaled.mp4', { width: 640 });

// 仅指定高度，宽度自动保持宽高比
await scaler.scale('input.mp4', 'scaled.mp4', { height: 360 });

// 精确指定宽高
await scaler.scale('input.mp4', 'scaled.mp4', { width: 640, height: 360 });
```

## 4. 输出格式

| 格式 | 枚举值 | 扩展名 | 说明 |
|------|--------|--------|------|
| MJPEG | `OutputFormat.MJPEG` | `.mjpeg` | 连续 JPEG 帧 |
| AVI-MJPEG | `OutputFormat.AVI_MJPEG` | `.avi` | AVI 容器，8 字节对齐 |
| H264 | `OutputFormat.H264` | `.h264` | H.264 裸流 + 自定义头 |

## 5. 错误处理

```typescript
import {
  VideoConverter,
  OutputFormat,
  FFmpegNotFoundError,
  FFmpegError
} from './video-converter';

try {
  await converter.convert('input.mp4', 'output.avi', OutputFormat.AVI_MJPEG);
} catch (error) {
  if (error instanceof FFmpegNotFoundError) {
    console.error('FFmpeg 未安装，请先安装 FFmpeg');
  } else {
    console.error('转换失败:', (error as Error).message);
  }
}
```

## 6. 获取视频信息

```typescript
const info = await converter.getVideoInfo('input.mp4');

console.log(`分辨率: ${info.width}x${info.height}`);
console.log(`帧率: ${info.frameRate} fps`);
console.log(`时长: ${info.duration.toFixed(2)} 秒`);
console.log(`总帧数: ${info.frameCount}`);
```

## 完整 API 导入

```typescript
import {
  VideoConverter,      // 转换器类
  VideoScaler,         // 独立缩放器类
  OutputFormat,        // 格式枚举
  VideoInfo,           // 视频信息类型
  ConversionResult,    // 转换结果类型
  ConversionOptions,   // 转换选项类型（含 scale 字段）
  ScaleOptions,        // 缩放参数类型 { width?, height? }
  ProgressCallback,    // 进度回调类型
  VideoConverterError,
  FFmpegNotFoundError,
  FFmpegError,
  VideoFormatError,
  PostProcessError
} from './video-converter';
```

## 系统要求

- ✅ Node.js 18+
- ✅ FFmpeg（必须在 PATH 中）
- ✅ TypeScript 5.0+（devDependency）
- ✅ @types/node（devDependency）

验证 FFmpeg：
```bash
ffmpeg -version
```

## 下一步

- 📖 项目说明: [README.md](./README.md)
- 🔧 集成指南: [INTEGRATION.md](./INTEGRATION.md)
- 📝 完整 API 参考: [SOURCE_INTEGRATION.md](./SOURCE_INTEGRATION.md)
- 🐛 问题反馈: https://github.com/Belief997/w01-video_converter/issues
