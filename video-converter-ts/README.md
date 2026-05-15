# Video Converter TypeScript

视频转换工具 - TypeScript 实现版本，支持多种输出格式。版本 1.2.0。

## 文档导航

- 📖 **[README.md](./README.md)** - 项目说明（当前文档）
- 📝 **[SOURCE_INTEGRATION.md](./SOURCE_INTEGRATION.md)** - 完整集成指南与 API 参考

## 功能特性

- 支持三种输出格式：MJPEG、AVI-MJPEG、H264
- **视频缩放预处理**：转换前可对输入视频进行缩放（宽度/高度，自动保持宽高比）
- **视频裁剪预处理**：转换前可对输入视频进行裁剪（居中或指定偏移）
- **有序预处理 pipeline**：通过 `preprocess` 数组可组合多步缩放/裁剪，按顺序执行
- **独立预处理 API**：`VideoScaler` / `VideoCropper` 可单独调用，与转换流程完全解耦
- 自动检测视频信息（分辨率、帧率、时长等）
- 进度回调
- AVI 文件 8 字节对齐处理
- H264 自定义头部封装
- 调试模式：保留所有预处理中间文件供排查（`<name>.pre-<N>-<type>.mp4`）
- 零运行时外部依赖（核心功能）
- 完整的 TypeScript 类型定义

## 系统要求

- Node.js 18+
- FFmpeg（需要在系统 PATH 中可用）

## 集成方式

将 `src/` 目录复制到你的项目即可使用，无需任何外部依赖。

```bash
# Linux/Mac
cp -r video-converter-ts/src your-project/src/video-converter

# Windows
xcopy /E video-converter-ts\src your-project\src\video-converter\
```

完整集成步骤详见 [SOURCE_INTEGRATION.md](./SOURCE_INTEGRATION.md)。

## 快速示例

```typescript
import { VideoConverter, OutputFormat } from './video-converter';

const converter = new VideoConverter((current, total) => {
  console.log(`进度: ${current}/${total}`);
});

// 获取视频信息
const info = await converter.getVideoInfo('input.mp4');
console.log(`分辨率: ${info.width}x${info.height}, 帧率: ${info.frameRate} fps`);

// 转换视频（含缩放预处理）
const result = await converter.convert(
  'input.mp4',
  'output.avi',
  OutputFormat.AVI_MJPEG,
  {
    frameRate: 25,
    quality: 2,
    scale: { width: 640 }  // 转换前先缩放至 640px 宽，高度自动保持宽高比
  }
);

console.log('转换完成:', result);
```

## API 概览

```typescript
import {
  VideoConverter,       // 主转换器类
  VideoScaler,          // 独立缩放器类
  VideoCropper,         // 独立裁剪器类
  OutputFormat,         // 输出格式枚举：MJPEG | AVI_MJPEG | H264
  VideoInfo,            // 视频信息接口
  ConversionResult,     // 转换结果接口
  ConversionOptions,    // 转换选项（含 preprocess、scale、debug 等）
  ScaleOptions,         // 缩放参数 { width?, height? }
  CropOptions,          // 裁剪参数 { width, height, x?, y? }
  PreprocessStep,       // 预处理步骤联合类型
  ProgressCallback,     // 进度回调类型
  VideoConverterError,
  VideoFormatError,
  FFmpegNotFoundError,
  FFmpegError,
  PostProcessError
} from './video-converter';
```

完整 API 文档详见 [SOURCE_INTEGRATION.md](./SOURCE_INTEGRATION.md)。

## 命令行工具

构建后可直接运行（仅在本仓库内使用）：

```bash
# 从源码构建
npm install && npm run build

# 查看视频信息
node dist/cli.js --info -i input.mp4

# 转换视频
node dist/cli.js -i input.mp4 -o output.avi -f avi_mjpeg -v

# 支持的格式：mjpeg | avi_mjpeg | h264
# 主要参数：-i 输入 -o 输出 -f 格式 -r 帧率 -q 质量 -v 详细 -d 调试
```

## 测试

```bash
# 运行所有测试
npm test -- --run

# 运行特定测试文件
npm test -- --run tests/avi-aligner.test.ts
npm test -- --run tests/video-scaler.test.ts

# 测试覆盖率
npm test -- --run --coverage
```

## 项目结构

```
video-converter-ts/
├── src/
│   ├── cli.ts              # 命令行入口（仅本仓库使用）
│   ├── converter.ts        # 主转换器（含缩放预处理）
│   ├── parser.ts           # 视频信息解析
│   ├── ffmpeg-builder.ts   # FFmpeg 命令构建（含 buildScaleCmd）
│   ├── ffmpeg-executor.ts  # FFmpeg 执行器
│   ├── models.ts           # 数据模型（ScaleOptions、ConversionOptions 等）
│   ├── errors.ts           # 错误定义
│   ├── index.ts            # 模块导出
│   ├── preprocess/
│   │   ├── video-scaler.ts # 独立缩放器（VideoScaler）
│   │   ├── video-cropper.ts # 独立裁剪器（VideoCropper）
│   │   └── index.ts
│   └── postprocess/
│       ├── avi-aligner.ts  # AVI 8字节对齐
│       ├── mjpeg-packer.ts # MJPEG 打包
│       ├── h264-packer.ts  # H264 封装
│       └── index.ts
├── tests/
│   ├── video-scaler.test.ts
│   ├── video-cropper.test.ts
│   ├── avi-aligner.test.ts
│   ├── mjpeg-packer.test.ts
│   ├── parser.test.ts
│   ├── ffmpeg-builder.test.ts
│   ├── ffmpeg-executor.test.ts
│   ├── h264-packer.test.ts
│   ├── functional/
│   │   └── functional.test.ts
│   └── manual/
│       └── run-conversions.js
├── dist/
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## 输出格式说明

### MJPEG 格式
- 连续的 JPEG 帧，每帧以 SOI (0xFFD8) 开始，EOI (0xFFD9) 结束

### AVI-MJPEG 格式
- 标准 AVI 容器，所有帧数据 8 字节对齐（JUNK 块和 APP1 段填充），含 idx1 索引

### H264 格式
- 自定义 32 字节头部（含分辨率、帧数、帧时间），后跟 H.264 裸流

## 常见问题

### FFmpeg 未找到
```bash
ffmpeg -version  # 验证 FFmpeg 是否在 PATH 中
```

### Windows PowerShell 执行策略问题
```bash
cmd /c "npm run build"
cmd /c "npm test -- --run"
```

## 版本

**1.2.0** — 新增 `VideoCropper` 独立裁剪器、`CropOptions`、`PreprocessStep` 联合类型、`ConversionOptions.preprocess` 有序 pipeline；`scale` 字段保持向后兼容

**1.1.0** — 新增 `VideoScaler` 独立缩放器、`ConversionOptions.scale` 字段、调试模式中间文件保留

## 许可证

MIT
