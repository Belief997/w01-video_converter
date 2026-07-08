# Changelog — image-to-jpeg-converter

格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

---

## [Unreleased]

---

## [1.3.0] - 2026-07-07

### Added
- 最小**内容**尺寸参数 `minWidth` / `minHeight`（CLI：`--min-width` / `--min-height`）：当原图任一维度小于对应下限时，编码前在**右侧/下方** padding（黑色填充）补齐到该下限；GUI 头部仍保持原始输入宽高。
  - 内容尺寸为 `max(原始尺寸, 下限)`，下限**不小于一个 MCU**：传入值小于 MCU 或省略时按对应 MCU 处理（默认即 MCU 值）。
  - 是否将内容尺寸再向上取整到 MCU 由 `align` 决定（两者正交，见 Changed）。
  - 设置任一项即触发 padding，**无需同时开启 `align`**；与 `align` 一样通过 `ffprobe` 读取原始宽高。
  - 仅当编码尺寸实际改变（SOF ≠ 原始）时才返回 `ConversionResult.encodedDimensions`。

### Changed
- **`align` 与 `min` 解耦**：明确 JPEG 物理编码始终以 MCU 为单位（编码器内部补齐、解码器裁剪）；`align` 仅控制 **JPEG SOF 标记报告的宽高**是否向上取整到 MCU。
  - `align` 关（默认）：SOF = 精确内容尺寸 `max(原始, 下限)`（可能非 MCU 整数倍）。
  - `align` 开：SOF = `向上取整到 MCU( max(原始, 下限) )`。
  - 因此仅设置 `min` 而不开 `align` 时，SOF 报告精确内容尺寸而非 MCU 对齐值（相较早期 1.3.0 草案的「始终取整到 MCU」行为）。
- `alignment` 模块函数 `computeAlignedDimensions` → **`computeEncodedDimensions`**，新增必填 `align: boolean` 参数（位于可选 `min` 之前）；`isAligned` 内部改为以 `align=true` 调用它。

### Notes
- `minWidth` / `minHeight` 默认未设置，默认转换路径行为不变，也不会调用 `ffprobe`。
- 4:2:0 / 4:2:2 的 SOF 宽高需为偶数，建议使用偶数 `min` 值。

---

## [1.2.0] - 2026-07-07

### Added
- MCU 对齐选项 `align`（CLI：`-a` / `--align`）：开启后，图片在编码前按色度采样的 MCU 粒度做右/下 padding，使 **JPEG 负载内 SOF 标记**的宽高为对齐后尺寸；MCU 粒度为 420→16×16、422→16×8、444/400→8×8。
- `ConversionResult.encodedDimensions`：仅当对齐实际改变了尺寸时出现，报告 JPEG SOF 中的对齐后宽高。
- `alignment` 模块：纯函数 `mcuSizeOf` / `computeAlignedDimensions` / `isAligned`，无 I/O，便于单元测试。

### Changed
- **GUI 头部（`gui_rgb_data_head_t`）始终保持原始输入宽高**：开启对齐时，原始尺寸经 `ffprobe` 读取，位字段（含 align 位）仍强制为 0，严格遵循 spec_v4.txt。
- `ConversionResult.dimensions` 明确为逻辑/原始尺寸（对齐关闭时与 SOF 一致）。

### Notes
- `align` 默认关闭，默认转换路径行为不变，也不会调用 `ffprobe`。
- 开启 `align` 需要 `ffprobe`（随 FFmpeg 一同安装）在 PATH 中可用。

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
