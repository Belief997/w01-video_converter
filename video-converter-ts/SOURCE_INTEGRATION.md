# 源码集成指南

本文档是将 video-converter 以源码方式集成到项目的完整参考文档。

## 核心优势

- ✅ **零运行时依赖** - 核心功能不依赖任何第三方包
- ✅ **纯 TypeScript** - 完整类型支持
- ✅ **模块化设计** - 只需复制 `src/` 目录
- ✅ **可自定义** - 直接修改源码满足特殊需求

---

## 需要哪些源文件

将以下文件复制到你的项目，`cli.ts` 不需要（依赖 commander，仅用于本仓库命令行工具）：

```
your-project/src/video-converter/
├── converter.ts          # 主转换器（VideoConverter 类，含缩放预处理）
├── parser.ts             # 视频信息解析（供 VideoConverter 和 VideoScaler 内部使用）
├── ffmpeg-builder.ts     # FFmpeg 命令构建（含 buildScaleCmd，供两个类使用）
├── ffmpeg-executor.ts    # FFmpeg 执行器（供两个类使用）
├── models.ts             # 所有类型：VideoInfo、ConversionOptions、ConversionResult、ScaleOptions、OutputFormat、ProgressCallback
├── errors.ts             # 错误类：VideoConverterError、VideoFormatError、FFmpegNotFoundError、FFmpegError、PostProcessError
├── index.ts              # 重导出全部公共 API
├── preprocess/
│   ├── video-scaler.ts   # 独立缩放器（VideoScaler 类，与 VideoConverter 完全解耦）
│   └── index.ts          # preprocess 导出入口
└── postprocess/
    ├── avi-aligner.ts    # AVI 8字节对齐后处理
    ├── mjpeg-packer.ts   # MJPEG 打包后处理
    ├── h264-packer.ts    # H264 自定义头部封装后处理
    └── index.ts          # postprocess 导出入口
```

> **注意：** `preprocess/` 目录是 1.1.0 新增的，务必一并复制。

---

## 快速集成（3 步）

### 第 1 步：复制源码文件

**使用脚本（推荐）：**

```bash
# Linux/Mac
chmod +x copy-source.sh
./copy-source.sh ../your-project/src/video-converter

# Windows
copy-source.bat ..\your-project\src\video-converter
```

**手动复制：**

```bash
# Linux/Mac
cp -r src/ your-project/src/video-converter/

# Windows
xcopy /E src\ your-project\src\video-converter\
```

### 第 2 步：配置 TypeScript

确保 `tsconfig.json` 包含 Node.js 类型，可选添加路径别名：

```json
{
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "target": "ES2022",
    "types": ["node"],
    "paths": {
      "@/video-converter": ["./src/video-converter/index.ts"]
    }
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0"
  }
}
```

### 第 3 步：导入并使用

```typescript
// 直接相对路径导入
import { VideoConverter, OutputFormat } from './video-converter';

// 或使用路径别名
import { VideoConverter, OutputFormat } from '@/video-converter';

const converter = new VideoConverter();
await converter.convert('input.mp4', 'output.avi', OutputFormat.AVI_MJPEG);
```

---

## 完整 API 参考

### 类型与枚举

```typescript
// 输出格式
enum OutputFormat {
  MJPEG     = 'mjpeg',      // 连续 JPEG 帧裸流
  AVI_MJPEG = 'avi_mjpeg',  // AVI 容器封装，8 字节对齐
  H264      = 'h264'        // H.264 裸流 + 自定义 32 字节头部
}

// 缩放参数（width / height 至少提供一个，均为正整数）
interface ScaleOptions {
  width?: number;   // 目标宽度；仅提供时高度自动保持宽高比（偶数值）
  height?: number;  // 目标高度；仅提供时宽度自动保持宽高比（偶数值）
  // 两者均提供时为精确尺寸（可能改变宽高比）
}

// 转换选项
interface ConversionOptions {
  frameRate?: number;      // 目标帧率（默认保持原帧率）
  quality?: number;        // MJPEG 质量 1-31（越小越好）；H264 CRF 0-51（越小越好）
  debug?: boolean;         // 默认 false；true 时保留缩放中间文件（.pre-scaled.mp4）
  scale?: ScaleOptions;    // 转换前先进行缩放预处理
}

// 视频信息
interface VideoInfo {
  width: number;
  height: number;
  frameRate: number;
  frameCount: number;
  duration: number;   // 秒
  codec: string;
  filePath: string;
}

// 转换结果
interface ConversionResult {
  success: boolean;
  inputPath: string;        // 始终为调用者传入的原始路径（非临时缩放路径）
  outputPath: string;
  outputFormat: OutputFormat;
  frameCount: number;
  frameRate: number;
  quality: number;
  errorMessage?: string;
}

// 进度回调
type ProgressCallback = (current: number, total: number) => void;
```

### VideoConverter 类

```typescript
class VideoConverter {
  /**
   * @param onProgress 可选进度回调，每处理一帧调用一次
   */
  constructor(onProgress?: ProgressCallback)

  /**
   * 获取视频信息，不进行转换
   */
  getVideoInfo(filePath: string): Promise<VideoInfo>

  /**
   * 转换视频。
   * 若 options.scale 存在，内部流程：缩放 → 转换 → 清理临时文件（finally 块）。
   * debug: true 时临时文件保存为 <output-basename>.pre-scaled.mp4，不清理。
   */
  convert(
    inputPath: string,
    outputPath: string,
    format: OutputFormat,
    options?: ConversionOptions
  ): Promise<ConversionResult>
}
```

### VideoScaler 类

`VideoScaler` 与 `VideoConverter` 完全解耦，内部自带独立的 FFmpegBuilder、FFmpegExecutor、VideoParser。

```typescript
class VideoScaler {
  constructor()

  /**
   * 缩放视频。
   * 缩放命令：ffmpeg -vf scale=W:H -c:v libx264 -crf 18 -preset fast
   * 自动维度使用 -2：scale=W:-2（仅宽）或 scale=-2:H（仅高）。
   * @throws VideoConverterError 若 width 和 height 均未提供，或值非正整数
   */
  scale(
    inputPath: string,
    outputPath: string,
    options: ScaleOptions
  ): Promise<void>
}
```

### 错误类

```typescript
class VideoConverterError extends Error {}   // 基类
class VideoFormatError extends VideoConverterError {}     // 不支持的格式
class FFmpegNotFoundError extends VideoConverterError {}  // FFmpeg 未安装或不在 PATH
class FFmpegError extends VideoConverterError {}          // FFmpeg 执行失败
class PostProcessError extends VideoConverterError {}     // 后处理失败
```

---

## 使用示例

### 基本转换

```typescript
import { VideoConverter, OutputFormat } from './video-converter';

const converter = new VideoConverter();

const result = await converter.convert(
  'input.mp4',
  'output.avi',
  OutputFormat.AVI_MJPEG
);

console.log('转换完成:', result);
```

### 带进度回调

```typescript
import { VideoConverter, OutputFormat } from './video-converter';

const converter = new VideoConverter((current, total) => {
  const percent = (current / total * 100).toFixed(1);
  process.stdout.write(`\r进度: ${percent}% (${current}/${total})`);
});

await converter.convert('input.mp4', 'output.avi', OutputFormat.AVI_MJPEG);
console.log('\n完成');
```

### 获取视频信息

```typescript
import { VideoConverter } from './video-converter';

const converter = new VideoConverter();
const info = await converter.getVideoInfo('input.mp4');

console.log(`分辨率: ${info.width}x${info.height}`);
console.log(`帧率: ${info.frameRate} fps`);
console.log(`总帧数: ${info.frameCount}`);
console.log(`时长: ${info.duration.toFixed(2)} 秒`);
console.log(`编码: ${info.codec}`);
```

### 带缩放的转换（集成方式）

转换器内部自动完成：**缩放 → 转换 → 清理临时文件**。

```typescript
import { VideoConverter, OutputFormat, ConversionOptions } from './video-converter';

const converter = new VideoConverter();

// 仅指定宽度，高度自动保持宽高比
const result = await converter.convert(
  'input.mp4',
  'output.avi',
  OutputFormat.AVI_MJPEG,
  { scale: { width: 640 } }
);

// 精确指定宽高
await converter.convert('input.mp4', 'output.mjpeg', OutputFormat.MJPEG, {
  scale: { width: 640, height: 360 }
});
```

### 独立使用 VideoScaler

```typescript
import { VideoScaler } from './video-converter';

const scaler = new VideoScaler();

// 仅指定宽度，高度自动保持宽高比（偶数值）
await scaler.scale('input.mp4', 'scaled_w640.mp4', { width: 640 });

// 仅指定高度，宽度自动保持宽高比（偶数值）
await scaler.scale('input.mp4', 'scaled_h360.mp4', { height: 360 });

// 精确指定宽高（可能改变宽高比）
await scaler.scale('input.mp4', 'scaled_exact.mp4', { width: 640, height: 360 });
```

### 调试模式

```typescript
import { VideoConverter, OutputFormat } from './video-converter';

const converter = new VideoConverter();

// debug: true 时，缩放临时文件保存为 output.pre-scaled.mp4，不自动清理
await converter.convert('input.mp4', 'output.avi', OutputFormat.AVI_MJPEG, {
  scale: { width: 320 },
  debug: true
});
// 转换后会保留 output.pre-scaled.mp4 供排查
```

### 错误处理

```typescript
import {
  VideoConverter,
  OutputFormat,
  VideoConverterError,
  VideoFormatError,
  FFmpegNotFoundError,
  FFmpegError,
  PostProcessError
} from './video-converter';

const converter = new VideoConverter();

try {
  await converter.convert('input.mp4', 'output.avi', OutputFormat.AVI_MJPEG);
} catch (error) {
  if (error instanceof FFmpegNotFoundError) {
    console.error('FFmpeg 未安装或未在 PATH 中，请先安装 FFmpeg');
  } else if (error instanceof VideoFormatError) {
    console.error('不支持的视频格式:', error.message);
  } else if (error instanceof FFmpegError) {
    console.error('FFmpeg 执行失败:', error.message);
  } else if (error instanceof PostProcessError) {
    console.error('后处理失败:', error.message);
  } else if (error instanceof VideoConverterError) {
    console.error('转换错误:', error.message);
  } else {
    throw error;  // 非预期错误，向上抛出
  }
}
```

---

## 依赖要求

### 运行时依赖

| 依赖 | 版本 | 说明 |
|------|------|------|
| Node.js | 18+ | 使用 ES Modules |
| FFmpeg | 任意 | 必须在系统 PATH 中（`ffmpeg -version` 验证） |

### 编译时依赖（devDependencies）

```json
{
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/node": "^20.10.0"
  }
}
```

核心功能**不需要任何运行时 npm 依赖**。

---

## 集成检查清单

- [ ] 复制 `src/`（含 `preprocess/` 和 `postprocess/`）到项目
- [ ] 在 `package.json` 中添加 `typescript` 和 `@types/node` 到 devDependencies
- [ ] 配置 `tsconfig.json`（module、moduleResolution、types）
- [ ] 验证 FFmpeg 已安装：`ffmpeg -version`
- [ ] 测试基本转换功能
- [ ] 测试错误处理（如传入不存在的文件）
- [ ] 将源码文件加入版本控制

---

## 示例项目结构（VSCode 插件）

```
your-vscode-extension/
├── src/
│   ├── extension.ts
│   ├── commands/
│   │   └── convertVideo.ts
│   └── video-converter/        ← 复制到此处
│       ├── converter.ts
│       ├── parser.ts
│       ├── models.ts
│       ├── errors.ts
│       ├── ffmpeg-builder.ts
│       ├── ffmpeg-executor.ts
│       ├── index.ts
│       ├── preprocess/
│       │   ├── video-scaler.ts
│       │   └── index.ts
│       └── postprocess/
│           ├── avi-aligner.ts
│           ├── mjpeg-packer.ts
│           ├── h264-packer.ts
│           └── index.ts
├── package.json
└── tsconfig.json
```

---

## 常见问题

### Q: 需要安装 commander 吗？

**A**: 不需要。`commander` 只用于本仓库的 CLI 工具（`cli.ts`），集成时不需要复制该文件。

### Q: 如何更新到新版本？

**A**: 从 GitHub 拉取最新源码后，对比差异手动同步变更的文件；或将本仓库作为 Git Submodule 管理。

### Q: VideoScaler 和 VideoConverter.convert(scale) 有什么区别？

**A**: 效果相同，使用场景不同：
- `VideoConverter.convert({ scale })` — 缩放是转换的一部分，适合"缩放后转格式"的完整流程
- `VideoScaler.scale()` — 纯粹的独立缩放，不涉及格式转换，适合只需缩放的场景

### Q: 支持哪些 Node.js 版本？

**A**: Node.js 18+（使用 ES Modules）。

### Q: 可以在浏览器中使用吗？

**A**: 不可以。依赖 Node.js 的 `fs`、`child_process` 等模块，只能在 Node.js 环境运行。

---

## 技术支持

- **GitHub**: https://github.com/Belief997/w01-video_converter
- **Issues**: https://github.com/Belief997/w01-video_converter/issues

## 许可证

MIT - 可自由使用、修改和分发
