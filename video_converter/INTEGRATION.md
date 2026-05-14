# Python 视频转换器 — 集成指南

本文档说明如何将 `video_converter` 以 **Python 库的方式**集成到你的项目中。

> ⚠️ **集成原则：直接调用 Python API，不通过命令行子进程调用。**

---

## 集成方式

### 方法一：复制源码（推荐）

将 `video_converter/` 目录复制到你的项目中：

```
your-project/
├── video_converter/        # 复制整个目录
│   ├── __init__.py
│   ├── converter.py
│   ├── ffmpeg_builder.py
│   ├── ffmpeg_executor.py
│   ├── parser.py
│   ├── postprocess.py
│   ├── models.py
│   └── exceptions.py
├── script/                 # 同时复制后处理脚本
│   ├── mkMJPEG.py
│   ├── procAVI_no_audio_first.py
│   ├── procAVI_no_audio_second.py
│   └── h264_pack.py
└── your_code.py
```

### 方法二：git submodule

```bash
git submodule add https://github.com/Belief997/w01-video_converter.git lib/video_converter
```

---

## 依赖要求

- **Python** ≥ 3.8
- **FFmpeg**（命令行可用）— `ffmpeg -version`
- Python 标准库（无第三方依赖）

---

## API 使用

### 基本转换

```python
from video_converter import VideoConverter, OutputFormat

# 创建转换器
converter = VideoConverter()

# 转换为 AVI-MJPEG
result = converter.convert(
    input_path="input.mp4",
    output_path="output.avi",
    output_format=OutputFormat.AVI_MJPEG,
    frame_rate=25,   # 可选，默认保持原帧率
    quality=1        # 可选，1最高质量
)

if result.success:
    print(f"转换完成: {result.output_path}")
    print(f"帧数: {result.frame_count}, 帧率: {result.frame_rate}")
```

### 转换为 MJPEG

```python
result = converter.convert(
    input_path="input.mp4",
    output_path="output.mjpeg",
    output_format=OutputFormat.MJPEG,
    quality=5
)
```

### 转换为 H264

```python
result = converter.convert(
    input_path="input.mp4",
    output_path="output.h264",
    output_format=OutputFormat.H264,
    frame_rate=30,
    quality=23   # H264 CRF 值，0-51，越小质量越高
)
```

### 获取视频信息

```python
converter = VideoConverter()
info = converter.get_video_info("input.mp4")

print(f"分辨率: {info.width}x{info.height}")
print(f"帧率: {info.frame_rate} fps")
print(f"帧数: {info.frame_count}")
print(f"时长: {info.duration:.2f} 秒")
print(f"编码: {info.codec}")
```

### 带进度回调

```python
def on_progress(current: int, total: int):
    percent = current / total * 100 if total > 0 else 0
    print(f"\r进度: {percent:.1f}%", end="", flush=True)

converter = VideoConverter(progress_callback=on_progress)
result = converter.convert("input.mp4", "output.avi", OutputFormat.AVI_MJPEG)
```

---

## 错误处理

```python
from video_converter import VideoConverter, OutputFormat
from video_converter.exceptions import (
    VideoConverterError,
    FFmpegNotFoundError,
    PostProcessError,
)

converter = VideoConverter()

try:
    result = converter.convert("input.mp4", "output.avi", OutputFormat.AVI_MJPEG)
except FileNotFoundError as e:
    print(f"输入文件不存在: {e}")
except FFmpegNotFoundError:
    print("FFmpeg 未安装，请先安装 FFmpeg 并确保其在 PATH 中")
except PostProcessError as e:
    print(f"后处理失败: {e}")
except VideoConverterError as e:
    print(f"转换失败: {e}")
```

---

## 数据类型说明

### `VideoInfo`

```python
@dataclass
class VideoInfo:
    width: int          # 视频宽度（像素）
    height: int         # 视频高度（像素）
    frame_rate: float   # 帧率（fps）
    frame_count: int    # 总帧数
    duration: float     # 时长（秒）
    codec: str          # 编码格式（如 'h264', 'mjpeg'）
    file_path: str      # 文件路径
```

### `ConversionResult`

```python
@dataclass
class ConversionResult:
    success: bool              # 是否成功
    input_path: str            # 输入文件路径
    output_path: str           # 输出文件路径
    output_format: OutputFormat  # 输出格式
    frame_count: int           # 帧数
    frame_rate: float          # 帧率
    quality: int               # 质量参数
    error_message: str | None  # 失败时的错误信息
```

### `OutputFormat`

```python
from video_converter import OutputFormat

OutputFormat.MJPEG      # 连续 JPEG 帧流
OutputFormat.AVI_MJPEG  # AVI 容器，8 字节对齐
OutputFormat.H264       # H264 裸流，带自定义头
```

---

## 注意事项

1. **不要通过 subprocess 调用 CLI**：应直接 `import` 模块使用 API
2. **`script/` 目录需一同复制**：`PostProcessor` 依赖这些脚本
3. **FFmpeg 需在 PATH 中**：转换器通过子进程调用 `ffmpeg` 和 `ffprobe`
4. **线程安全**：`VideoConverter` 实例非线程安全，多线程场景每线程创建独立实例
