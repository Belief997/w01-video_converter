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
- `video-converter-ts@1.3.0`：新增 `AVI_MSV1` 输出格式（Microsoft Video 1 / CRAM），支持 GIF 透明背景合成、scale/crop preprocess pipeline、自动 4 倍数尺寸对齐
- `video-converter-ts@1.4.0`：新增 `AVI_CINEPAK` 输出格式（Cinepak / cvid），支持 GIF 透明背景合成、自动 4 倍数尺寸对齐、`setsar=1` 修复 Windows 原生解码器右侧条纹缺陷

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
