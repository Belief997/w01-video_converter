# Changelog — video-converter-ts

格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

---

## [Unreleased]

---

## [1.0.0] - 2026-01-20

### Added
- `VideoConverter`：主转换器类，支持 MJPEG / AVI-MJPEG / H264 三种输出格式
- `FFmpegBuilder`：FFmpeg 命令构建器（TypeScript 实现）
- `FFmpegExecutor`：子进程执行器，支持进度回调
- `VideoParser`：基于 ffprobe 的视频信息解析
- `postprocess/AviAligner`：纯 TypeScript AVI 8 字节对齐实现
- `postprocess/MjpegPacker`：纯 TypeScript MJPEG 打包实现
- `postprocess/H264Packer`：H264 自定义头部封装
- CLI 入口：`node dist/cli.js`，基于 Commander
- 调试模式（`-d`）：保留 AVI 转换中间文件
- 发布为 npm 包：`@belief997/video-converter@1.0.0`
- 完整 TypeScript 类型定义
