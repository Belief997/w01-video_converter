# Changelog

本文件记录仓库级别的重要变更。各子模块有独立 CHANGELOG：
- [video_converter/CHANGELOG.md](./video_converter/CHANGELOG.md)
- [video-converter-ts/CHANGELOG.md](./video-converter-ts/CHANGELOG.md)
- [image-to-jpeg-converter/CHANGELOG.md](./image-to-jpeg-converter/CHANGELOG.md)

格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

---

## [Unreleased]

### Added
- 根目录 `README.md`：仓库概览与快速开始
- `docs/` 文档框架：架构、格式规范、各模块说明
- `agent/agent.md`：Agent 开发约束与项目上下文

### Changed
- 清理散落在根目录的测试脚本和临时文档

---

## [1.0.0] - 2026-01-20

### Added
- `video_converter/`：Python 视频转换器（MJPEG/AVI-MJPEG/H264）
- `video-converter-ts/`：TypeScript 视频转换器，发布为 `@belief997/video-converter@1.0.0`
- `image-to-jpeg-converter/`：TypeScript 图片转换器，生成嵌入式 GUI 专用 `.bin` 文件
- `script/`：后处理 Python 脚本集（mkMJPEG、procAVI、h264_pack）
- `script/spec_v4.txt`：嵌入式 GUI 二进制格式规范
