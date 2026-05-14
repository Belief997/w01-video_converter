# Changelog — image-to-jpeg-converter

格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

---

## [Unreleased]

---

## [1.1.0] - 2026-01-20

### Added
- 透明度图片支持：PNG/WEBP/GIF 等含 alpha 通道的图片，通过 FFmpeg `scale2ref + overlay` 滤镜合并背景色
- `--background` / `-b` 参数：指定透明区域背景色（默认 black）

### Changed
- 严格遵循 spec_v4.txt：`gui_rgb_data_head_t` 中除 `type`、`w`、`h` 外，其余字段强制为 0
- 输出文件扩展名统一为 `.bin`

---

## [1.0.0] - 2025-12-01

### Added
- `convertToJpeg()`：图片转带自定义头 JPEG 的主函数
- `HeaderGenerator`：生成 `gui_rgb_data_head_t` 和 `gui_jpeg_file_head_t` 二进制结构
- `FileAssembler`：拼装最终 `.bin` 文件
- `FFmpegExecutor`：调用 FFmpeg 执行图片转换
- `Validator`：参数校验
- 支持采样格式：400（灰度）、420、422、444
- 质量参数：1-31（数值越小质量越高）
- CLI 入口：`node dist/cli.js`
- 完整 TypeScript 类型定义
