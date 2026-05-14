# 系统架构

## 概述

本仓库包含三个独立但功能相关的转换工具，均依赖 FFmpeg 执行底层媒体处理，输出面向**嵌入式显示系统**的专有二进制格式。

```
输入文件
  │
  ▼
FFmpeg（编解码核心）
  │
  ├─▶ video_converter (Python)        视频 → MJPEG / AVI-MJPEG / H264
  ├─▶ video-converter-ts (TypeScript) 视频 → MJPEG / AVI-MJPEG / H264
  └─▶ image-to-jpeg-converter (TS)    图片 → JPEG + 自定义头 → .bin
```

---

## 模块关系

```
video_converter/        video-converter-ts/      image-to-jpeg-converter/
(Python)                (TypeScript)             (TypeScript)
    │                       │                         │
    ├─ ffmpeg_builder.py     ├─ ffmpeg-builder.ts      ├─ ffmpeg-executor.ts
    ├─ ffmpeg_executor.py    ├─ ffmpeg-executor.ts     ├─ converter.ts
    ├─ parser.py             ├─ parser.ts              ├─ header-generator.ts
    ├─ postprocess.py        ├─ postprocess/           ├─ file-assembler.ts
    └─ models.py             └─ models.ts              └─ types.ts
          │
          ▼
      script/                 script/
    (后处理脚本)              (后处理脚本)
    mkMJPEG.py               (TS 自实现)
    procAVI_*.py
    h264_pack.py
```

## 数据流

### 视频转换（MJPEG）
```
input.mp4
  → FFmpeg 提取 JPEG 帧 (frame_0001.jpg ...)
  → mkMJPEG.py / MjpegPacker 打包为连续帧流
  → output.mjpeg
```

### 视频转换（AVI-MJPEG）
```
input.mp4
  → FFmpeg 编码 AVI（-vcodec mjpeg）
  → procAVI_no_audio_first.py / AviAligner 第一步（JUNK 块 + 首帧对齐）
  → procAVI_no_audio_second.py / AviAligner 第二步（全帧 8 字节对齐）
  → output.avi
```

### 视频转换（H264）
```
input.mp4
  → FFmpeg 编码 H264 裸流（-c:v libx264 -f rawvideo）
  → h264_pack.py / H264Packer 添加 32 字节自定义头
  → output.h264
```

### 图片转换
```
input.png/jpg
  → FFmpeg 转换采样格式 + 质量（-pix_fmt yuvj420p -q:v N）
  → header-generator.ts 生成 gui_rgb_data_head_t（8 字节）
  → file-assembler.ts 拼接头部 + size + dummy + JPEG 数据
  → output.bin
```

---

## 二进制格式规范

详见 [`script/spec_v4.txt`](../script/spec_v4.txt) 和 [`docs/formats.md`](./formats.md)。

---

## 技术栈

| 层 | 工具 |
|----|------|
| 媒体处理 | FFmpeg（命令行调用） |
| Python 模块 | Python 3.8+，标准库 + subprocess |
| TypeScript 模块 | TypeScript 5，Node.js 18，Vitest 测试 |
| Python 测试 | pytest + hypothesis（属性测试） |
| 依赖管理 | pip（Python），npm（TypeScript） |
