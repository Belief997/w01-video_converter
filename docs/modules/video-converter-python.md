# Python 视频转换器

**路径：** `video_converter/`  
**入口：** `python -m video_converter`  
**依赖：** Python 3.8+、FFmpeg、`script/` 目录下后处理脚本

---

## 功能

将视频文件转换为以下格式：
- **MJPEG** — 连续 JPEG 帧流
- **AVI-MJPEG** — AVI 容器，帧数据 8 字节对齐
- **H264** — 带自定义 32 字节头部的 H264 裸流

---

## 安装

```bash
pip install -r requirements.txt
```

---

## CLI 用法

```bash
# 查看视频信息
python -m video_converter -i input.mp4 --info

# 转换为 MJPEG
python -m video_converter -i input.mp4 -o output.mjpeg -f mjpeg

# 转换为 AVI-MJPEG（指定帧率和质量）
python -m video_converter -i input.mp4 -o output.avi -f avi_mjpeg -r 25 -q 1

# 转换为 H264
python -m video_converter -i input.mp4 -o output.h264 -f h264 -r 30 -q 23

# 显示详细进度
python -m video_converter -i input.mp4 -o output.avi -f avi_mjpeg -v
```

### 参数说明

| 参数 | 简写 | 必填 | 说明 |
|------|------|------|------|
| `--input` | `-i` | ✅ | 输入视频文件路径 |
| `--output` | `-o` | 转换时必填 | 输出文件路径 |
| `--format` | `-f` | 转换时必填 | `mjpeg` / `avi_mjpeg` / `h264` |
| `--framerate` | `-r` | 可选 | 目标帧率（默认保持原帧率） |
| `--quality` | `-q` | 可选 | MJPEG/AVI: 1-31（1最高），H264: CRF 0-51（默认 1） |
| `--info` | | | 仅显示视频信息，不转换 |
| `--verbose` | `-v` | | 显示详细进度 |

---

## API 用法

```python
from video_converter import VideoConverter, OutputFormat

converter = VideoConverter(
    progress_callback=lambda current, total: print(f"{current}/{total}")
)

# 获取视频信息
info = converter.get_video_info("input.mp4")
print(f"{info.width}x{info.height} @ {info.frame_rate}fps")

# 执行转换
result = converter.convert(
    input_path="input.mp4",
    output_path="output.avi",
    output_format=OutputFormat.AVI_MJPEG,
    frame_rate=25,
    quality=1
)
```

---

## 模块结构

```
video_converter/
├── __main__.py         # python -m 入口
├── cli.py              # argparse CLI
├── converter.py        # VideoConverter 主类
├── ffmpeg_builder.py   # FFmpeg 命令构建（MJPEG/AVI/H264）
├── ffmpeg_executor.py  # 子进程执行 + 进度解析
├── parser.py           # ffprobe 视频信息解析
├── postprocess.py      # 调用 script/ 目录脚本
├── models.py           # VideoInfo, ConversionResult, OutputFormat
└── exceptions.py       # VideoConverterError, FFmpegNotFoundError
```

---

## 后处理脚本依赖

Python 转换器调用 `script/` 目录下的脚本完成后处理：

| 脚本 | 调用时机 |
|------|---------|
| `mkMJPEG.py` | MJPEG 格式：将 JPEG 帧目录打包为流 |
| `procAVI_no_audio_first.py` | AVI-MJPEG 格式：第一步对齐处理 |
| `procAVI_no_audio_second.py` | AVI-MJPEG 格式：第二步全帧 8 字节对齐 |
| `h264_pack.py` | H264 格式：添加 32 字节自定义头 |

---

## 测试

```bash
pytest
```
