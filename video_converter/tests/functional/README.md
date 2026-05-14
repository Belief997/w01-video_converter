# Python 视频转换器 — 功能测试说明

## 概述

本目录包含 `video_converter` 模块的**端到端功能测试**，验证实际 FFmpeg 转换流程。

> ⚠️ 功能测试依赖真实的 FFmpeg 和测试视频文件，与单元测试分开运行。

---

## 前置条件

1. **FFmpeg 已安装**（命令行可用）
   ```bash
   ffmpeg -version
   ```

2. **测试视频存在**
   ```
   test_video/birds.mp4   # 标准测试视频（从仓库根目录运行）
   ```

3. **Python 依赖已安装**
   ```bash
   pip install -r requirements.txt
   ```

---

## 运行方式

### 运行所有功能测试

```bash
# 从仓库根目录运行
pytest video_converter/tests/functional/ -v
```

### 运行单个测试

```bash
# 仅测试 MJPEG 转换
pytest video_converter/tests/functional/test_functional.py::TestVideoConverter::test_convert_to_mjpeg -v

# 仅测试 AVI-MJPEG 转换
pytest video_converter/tests/functional/test_functional.py::TestVideoConverter::test_convert_to_avi_mjpeg -v

# 仅测试 H264 转换
pytest video_converter/tests/functional/test_functional.py::TestVideoConverter::test_convert_to_h264 -v
```

### 跳过功能测试（在无 FFmpeg 环境中）

```bash
pytest --ignore=video_converter/tests/functional/
```

---

## 测试内容

| 测试 | 验证点 |
|------|--------|
| `test_get_video_info` | 能正确解析视频分辨率、帧率、帧数、时长、编码 |
| `test_convert_to_mjpeg` | 输出文件存在，大小 > 0，内容以 0xFFD8 开始 |
| `test_convert_to_avi_mjpeg` | 输出文件存在，大小 > 0，内容以 RIFF 开始 |
| `test_convert_to_h264` | 输出文件存在，大小 > 0，包含自定义 32 字节头 |
| `test_convert_with_framerate` | 指定帧率时转换成功 |
| `test_invalid_input` | 输入文件不存在时抛出 FileNotFoundError |

---

## 预期输出

```
test_functional.py::TestVideoConverter::test_get_video_info PASSED
test_functional.py::TestVideoConverter::test_convert_to_mjpeg PASSED
test_functional.py::TestVideoConverter::test_convert_to_avi_mjpeg PASSED
test_functional.py::TestVideoConverter::test_convert_to_h264 PASSED
test_functional.py::TestVideoConverter::test_convert_with_framerate PASSED
test_functional.py::TestVideoConverter::test_invalid_input PASSED
```
