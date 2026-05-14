# Agent 开发指南

本文档为 AI Agent 提供仓库上下文、开发约束和行为规范，以确保生成的代码和文档符合项目规范。

---

## 仓库概览

本仓库是一个**视频与图片转换工具集**，面向嵌入式显示系统，包含三个独立子模块：

| 模块 | 路径 | 语言 | 功能 |
|------|------|------|------|
| Python 视频转换器 | `video_converter/` | Python 3.8+ | 视频 → MJPEG / AVI-MJPEG / H264 |
| TypeScript 视频转换器 | `video-converter-ts/` | TypeScript / Node 18+ | 视频 → MJPEG / AVI-MJPEG / H264（npm 包） |
| 图片转 JPEG | `image-to-jpeg-converter/` | TypeScript / Node 18+ | 图片 → JPEG + 自定义头 → `.bin` |

所有模块均依赖 **FFmpeg** 执行底层媒体处理。

---

## 项目关键约束

### 1. 输出格式规范（严格遵守）

所有输出格式必须符合 [`script/spec_v4.txt`](../script/spec_v4.txt)，核心约束：

- **JPEG `.bin` 文件头部**：`gui_rgb_data_head_t` 只填充 `type=12`、`w`、`h`，其余字段**强制为 0**
- **AVI-MJPEG**：所有帧数据必须 **8 字节对齐**
- **H264**：必须有 **32 字节自定义头部**（包含分辨率、帧数、帧时间等）
- **MJPEG**：仅 Baseline JPEG（SOF0），从 `0xFFD8` 开始，以 `0xFFD9` 结束

### 2. 二进制字节序

所有多字节字段使用**小端序（Little-Endian）**：
- width/height：uint16 LE
- size/dummy：uint32 LE

### 3. FFmpeg 命令

不直接操作音视频数据，通过 FFmpeg 子进程执行编解码。命令参数变更需确保与规范对齐。

---

## 模块开发规范

### Python（`video_converter/`）

- 保持现有 `VideoConverter` → `FFmpegBuilder` → `FFmpegExecutor` → `PostProcessor` 架构
- 后处理必须调用 `script/` 目录下对应脚本，不直接重写后处理逻辑
- 错误统一使用 `VideoConverterError` / `FFmpegNotFoundError` / `PostProcessError`
- 新增格式支持需在 `OutputFormat` 枚举、`FFmpegBuilder`、`PostProcessor`、`converter.py` 中同步添加

### TypeScript 视频转换器（`video-converter-ts/`）

- 后处理逻辑为纯 TypeScript 实现（`src/postprocess/`），不调用外部脚本
- 保持 `VideoConverter` → `FFmpegBuilder` → `FFmpegExecutor` → `PostProcess` 架构
- 使用 `commander` 构建 CLI
- 测试用 `vitest`，测试文件放在 `tests/`

### 图片转 JPEG（`image-to-jpeg-converter/`）

- `header-generator.ts` 是核心，**不得**将非零值写入 `scan/align/resize/compress/jpeg/idu/rsvd/version/rsvd2` 字段
- `file-assembler.ts` 负责最终文件拼接，顺序：`encodeRgbHeader` → `size(LE)` → `dummy(LE)` → JPEG 数据
- 输出文件扩展名统一为 `.bin`
- 透明度图片需通过 FFmpeg 的 `scale2ref + overlay` 滤镜处理背景

---

## 文件组织规范

### 测试文件

- **单元测试**放在各模块的 `tests/unit/`（TypeScript）或 `tests/`（Python）
- **功能测试（端到端）**放在各模块的 `tests/functional/`，包含 `README.md` 说明运行方式
- **不得**在仓库根目录或子模块根目录创建 `test-*.js` / `test_*.py` 等散落脚本
- 测试运行产生的输出文件（`.bin`、`.avi`、`.jpg` 等）**不提交**到 git

### 测试规范

**每个模块必须提供功能测试（`tests/functional/`），需满足：**
1. 包含 `README.md`，说明前置条件、运行方式、测试内容和预期输出
2. 测试脚本验证真实转换结果（输出文件格式、内容、字节级正确性）
3. 若外部依赖（如 FFmpeg）不可用，自动跳过而非报错

### 测试素材

- 图片素材放在 `test_image/`
- 视频素材放在 `test_video/`
- 测试固定资源（fixtures）放在各模块 `tests/fixtures/`

### 文档

- 仓库级文档放在 `docs/`（不要散落在根目录）
- 各子模块的详细文档放在子模块自己的目录内（如 `video-converter-ts/README.md`）
- 不创建临时性的 `*_SUMMARY.md`、`*_REPORT.md` 等开发笔记文件

---

## 集成规范

### ⛔ 禁止：通过命令行调用集成

不得在集成代码中使用 subprocess/exec 调用 CLI 命令，例如：

```python
# ❌ 错误方式
import subprocess
subprocess.run(["python", "-m", "video_converter", "-i", "input.mp4", ...])
```

```typescript
// ❌ 错误方式
import { exec } from 'child_process';
exec('node dist/cli.js -i input.mp4 ...');
```

### ✅ 正确：直接调用 API

```python
# ✅ 正确方式
from video_converter import VideoConverter, OutputFormat
converter = VideoConverter()
result = converter.convert("input.mp4", "output.avi", OutputFormat.AVI_MJPEG)
```

```typescript
// ✅ 正确方式
import { VideoConverter, OutputFormat } from './video-converter';
const converter = new VideoConverter();
const result = await converter.convert('input.mp4', 'output.avi', OutputFormat.AVI_MJPEG);
```

### 解耦原则

- 各模块**必须可独立使用**，不依赖其他模块的存在
- 模块内部各层（构建、执行、后处理）通过接口解耦，便于单独测试
- 新增功能时，先在对应的抽象层（Builder/Executor/Processor）中实现，再在顶层 Converter 中组合
- CLI 为可选入口，不应是唯一使用方式

---

## 常用命令

### 构建 & 测试

```bash
# Python
pip install -r requirements.txt
pytest

# TypeScript 视频转换器
cd video-converter-ts && npm install && npm run build && npm test

# 图片转 JPEG
cd image-to-jpeg-converter && npm install && npm run build && npm test
```

### 运行转换

```bash
# Python - 视频信息
python -m video_converter -i test_video/birds.mp4 --info

# TS - 视频转换
node video-converter-ts/dist/cli.js -i test_video/birds.mp4 -o output.avi -f avi_mjpeg -v

# TS - 图片转换
node image-to-jpeg-converter/dist/cli.js -i test_image/ac_cold.png -o output.bin -s 420 -q 5
```

---

## 参考文档

- [系统架构](../docs/architecture.md)
- [输出格式规范](../docs/formats.md)
- [Python 视频转换器](../docs/modules/video-converter-python.md)
- [TypeScript 视频转换器](../docs/modules/video-converter-ts.md)
- [图片转 JPEG 转换器](../docs/modules/image-to-jpeg.md)
- [嵌入式格式规范原文](../script/spec_v4.txt)
