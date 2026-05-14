# w01-video_converter

视频与图片转换工具集，面向**嵌入式显示系统**。支持将视频转换为 MJPEG/AVI-MJPEG/H264 格式，将图片转换为带自定义二进制头的 JPEG `.bin` 文件。

## 模块概览

| 模块 | 语言 | 入口 | 说明 |
|------|------|------|------|
| [`video_converter/`](./video_converter/) | Python | `python -m video_converter` | 视频转换器（MJPEG/AVI-MJPEG/H264） |
| [`video-converter-ts/`](./video-converter-ts/) | TypeScript | `node dist/cli.js` | 视频转换器 TypeScript 版（同上，已发布 npm） |
| [`image-to-jpeg-converter/`](./image-to-jpeg-converter/) | TypeScript | `node dist/cli.js` | 图片转带自定义头 JPEG（嵌入式 GUI 专用） |

> 三个模块均依赖 **FFmpeg**（需在系统 PATH 中可用）。

---

## 快速开始

### 视频转换（Python）

```bash
# 安装依赖
pip install -r requirements.txt

# 查看视频信息
python -m video_converter -i test_video/birds.mp4 --info

# 转换为 AVI-MJPEG
python -m video_converter -i test_video/birds.mp4 -o output.avi -f avi_mjpeg -r 25 -q 1

# 转换为 MJPEG
python -m video_converter -i test_video/birds.mp4 -o output.mjpeg -f mjpeg

# 转换为 H264
python -m video_converter -i test_video/birds.mp4 -o output.h264 -f h264 -r 30
```

### 视频转换（TypeScript）

```bash
cd video-converter-ts
npm install && npm run build

# 查看视频信息
node dist/cli.js --info -i ../test_video/birds.mp4

# 转换为 AVI-MJPEG
node dist/cli.js -i ../test_video/birds.mp4 -o output.avi -f avi_mjpeg -v
```

### 图片转 JPEG（TypeScript）

```bash
cd image-to-jpeg-converter
npm install && npm run build

# 转换图片（4:2:0，质量 5，输出 .bin）
node dist/cli.js -i test_image/ac_cold.png -o output.bin -s 420 -q 5
```

---

## 目录结构

```
w01-video_converter/
├── video_converter/          # Python 视频转换器
│   ├── converter.py          # 主转换器
│   ├── cli.py                # CLI 入口
│   ├── ffmpeg_builder.py     # FFmpeg 命令构建
│   ├── ffmpeg_executor.py    # FFmpeg 执行器
│   ├── parser.py             # 视频信息解析
│   ├── postprocess.py        # 后处理调度
│   └── models.py             # 数据模型
├── video-converter-ts/       # TypeScript 视频转换器
│   ├── src/                  # 源码
│   └── tests/                # 单元测试
├── image-to-jpeg-converter/  # TypeScript 图片转换器
│   ├── src/                  # 源码
│   ├── tests/                # 单元测试
│   └── examples/             # 使用示例
├── script/                   # 后处理 Python 脚本
│   ├── mkMJPEG.py            # JPEG 帧打包为 MJPEG 流
│   ├── procAVI_no_audio_first.py   # AVI 对齐处理第一步
│   ├── procAVI_no_audio_second.py  # AVI 对齐处理第二步
│   ├── h264_pack.py          # H264 自定义头部封装
│   ├── spec_v4.txt           # 嵌入式 GUI 二进制格式规范
│   └── spec.txt              # 原始规范
├── test_image/               # 测试用图片素材
├── test_video/               # 测试用视频素材
├── agent/
│   └── agent.md              # Agent 开发约束与项目上下文
└── docs/                     # 详细文档
    ├── architecture.md       # 系统架构
    ├── formats.md            # 输出格式规范
    └── modules/              # 各模块详细说明
```

---

## 系统要求

- **FFmpeg** ≥ 4.0（命令行可用）
- **Python** ≥ 3.8（video_converter 模块）
- **Node.js** ≥ 18（TypeScript 模块）

## 文档

详见 [`docs/`](./docs/) 目录：

- [系统架构](./docs/architecture.md)
- [输出格式规范](./docs/formats.md)
- [Python 视频转换器](./docs/modules/video-converter-python.md)
- [TypeScript 视频转换器](./docs/modules/video-converter-ts.md)
- [图片转 JPEG 转换器](./docs/modules/image-to-jpeg.md)

## License

MIT
