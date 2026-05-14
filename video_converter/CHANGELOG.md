# Changelog — video_converter (Python)

格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

---

## [Unreleased]

---

## [1.0.0] - 2026-01-20

### Added
- `VideoConverter`：主转换器类，支持 MJPEG / AVI-MJPEG / H264 三种输出格式
- `FFmpegBuilder`：FFmpeg 命令构建器
- `FFmpegExecutor`：子进程执行器，支持进度回调
- `VideoParser`：基于 ffprobe 的视频信息解析
- `PostProcessor`：后处理调度，调用 `script/` 目录脚本
- `MjpegParser`、`AviParser`：二进制格式解析工具
- CLI 入口：`python -m video_converter`
- 完整异常体系：`VideoConverterError`、`FFmpegNotFoundError`、`PostProcessError` 等
