#!/usr/bin/env python3
"""
人工测试脚本 — video_converter (Python)

将测试视频转换为各种格式，输出到 video_converter/test-output/ 目录，供人工校验。

运行方式（在仓库根目录下）：
    python video_converter/tests/manual/run_conversions.py
    或
    python video_converter/tests/manual/run_conversions.py [input.mp4]

结束后请在 video_converter/test-output/ 目录中手动验证：
    - birds.avi       → 可用 ffplay / 视频播放器打开（AVI-MJPEG）
    - birds_hq.avi    → AVI-MJPEG 高质量版本
    - birds_15fps.avi → 帧率限制为 15fps
    - birds.mjpeg     → 可用 ffplay 打开
    - birds.h264      → 可用 ffplay birds.h264 打开
"""

import sys
import os
import shutil
import time
from pathlib import Path

# 允许从任意目录执行时正确找到 video_converter 包
_SCRIPT_DIR = Path(__file__).resolve().parent
_MODULE_ROOT = _SCRIPT_DIR.parent.parent.parent   # 仓库根目录
sys.path.insert(0, str(_MODULE_ROOT))

from video_converter import VideoConverter, OutputFormat
from video_converter.exceptions import VideoConverterError, FFmpegNotFoundError

# ─── 路径 ───────────────────────────────────────────────────────────────────
REPO_ROOT = _MODULE_ROOT
OUTPUT_DIR = REPO_ROOT / "video_converter" / "test-output"

input_path = Path(sys.argv[1]) if len(sys.argv) > 1 else REPO_ROOT / "test_video" / "birds.mp4"
input_name = input_path.stem


# ─── 工具函数 ─────────────────────────────────────────────────────────────
def format_bytes(n: int) -> str:
    if n < 1024:
        return f"{n} B"
    if n < 1024 * 1024:
        return f"{n / 1024:.1f} KB"
    return f"{n / (1024 * 1024):.2f} MB"


def print_sep():
    print("─" * 60)


# ─── 前置检查 ─────────────────────────────────────────────────────────────
if shutil.which("ffmpeg") is None:
    print("❌ FFmpeg 未安装或不在 PATH 中")
    sys.exit(1)

if not input_path.exists():
    print(f"❌ 输入文件不存在: {input_path}")
    print("用法: python run_conversions.py [input.mp4]")
    sys.exit(1)

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


# ─── 转换任务列表 ─────────────────────────────────────────────────────────
TASKS = [
    {
        "label": "AVI-MJPEG（默认质量）",
        "output_file": f"{input_name}.avi",
        "output_format": OutputFormat.AVI_MJPEG,
        "kwargs": {},
    },
    {
        "label": "AVI-MJPEG（高质量 q=1）",
        "output_file": f"{input_name}_hq.avi",
        "output_format": OutputFormat.AVI_MJPEG,
        "kwargs": {"quality": 1},
    },
    {
        "label": "AVI-MJPEG（限速 15fps）",
        "output_file": f"{input_name}_15fps.avi",
        "output_format": OutputFormat.AVI_MJPEG,
        "kwargs": {"frame_rate": 15},
    },
    {
        "label": "MJPEG 裸流",
        "output_file": f"{input_name}.mjpeg",
        "output_format": OutputFormat.MJPEG,
        "kwargs": {},
    },
    {
        "label": "H264",
        "output_file": f"{input_name}.h264",
        "output_format": OutputFormat.H264,
        "kwargs": {},
    },
]


# ─── 主流程 ───────────────────────────────────────────────────────────────
print()
print("🎬  video_converter (Python) 人工测试")
print_sep()
print(f"输入:  {input_path}")
print(f"输出:  {OUTPUT_DIR}")
print_sep()
print(f"输入大小: {format_bytes(input_path.stat().st_size)}")
print()

results = []

for task in TASKS:
    output_path = OUTPUT_DIR / task["output_file"]
    progress_data = {"last": 0}

    def on_progress(current: int, total: int, _data=progress_data):
        pct = int(current / total * 100) if total > 0 else 0
        if pct - _data["last"] >= 20:
            print(f" {pct}%", end="", flush=True)
            _data["last"] = pct

    print(f"  ⏳ {task['label']} ...", end="", flush=True)
    start = time.time()

    try:
        converter = VideoConverter(progress_callback=on_progress)
        converter.convert(
            input_path=str(input_path),
            output_path=str(output_path),
            output_format=task["output_format"],
            **task["kwargs"],
        )
        elapsed = time.time() - start
        out_size = output_path.stat().st_size if output_path.exists() else 0
        print(f"  ✅ 完成 ({elapsed:.1f}s, {format_bytes(out_size)})")
        results.append({"label": task["label"], "file": task["output_file"],
                        "success": True, "size": out_size, "elapsed": elapsed})
    except FFmpegNotFoundError:
        elapsed = time.time() - start
        print(f"  ❌ 失败 ({elapsed:.1f}s): FFmpeg 未找到")
        results.append({"label": task["label"], "file": task["output_file"],
                        "success": False, "error": "FFmpeg 未找到"})
    except VideoConverterError as e:
        elapsed = time.time() - start
        print(f"  ❌ 失败 ({elapsed:.1f}s): {e}")
        results.append({"label": task["label"], "file": task["output_file"],
                        "success": False, "error": str(e)})


# ─── 汇总 ─────────────────────────────────────────────────────────────────
print()
print_sep()
print("📊  转换汇总")
print_sep()
for r in results:
    status = "✅" if r["success"] else "❌"
    detail = f"{format_bytes(r['size'])} ({r['elapsed']:.1f}s)" if r["success"] else r["error"]
    print(f"  {status} {r['file']:<25} {detail}")
print_sep()

print()
print("🔍  请在以下目录中手动验证输出:")
print(f"   {OUTPUT_DIR}")
print()
print("   验证方法:")
print(f"   ffplay \"{OUTPUT_DIR / f'{input_name}.avi'}\"    # AVI 播放")
print(f"   ffplay \"{OUTPUT_DIR / f'{input_name}.mjpeg'}\"  # MJPEG 播放")
print(f"   ffplay \"{OUTPUT_DIR / f'{input_name}.h264'}\"   # H264 播放")
print(f"   ffprobe \"{OUTPUT_DIR / f'{input_name}.avi'}\"   # 检查格式信息")
print()

failed = sum(1 for r in results if not r["success"])
sys.exit(1 if failed else 0)
