"""
video_converter 功能测试

端到端测试，验证实际 FFmpeg 转换流程。
运行前请确保：
  1. FFmpeg 已安装（ffmpeg -version）
  2. 测试视频存在：test_video/birds.mp4（从仓库根目录运行）

运行方式：
  pytest video_converter/tests/functional/ -v
"""

import os
import shutil
import tempfile
from pathlib import Path
import pytest

# 跳过标记：若 FFmpeg 不可用则跳过所有测试
ffmpeg_available = shutil.which("ffmpeg") is not None
pytestmark = pytest.mark.skipif(
    not ffmpeg_available,
    reason="FFmpeg 未安装，跳过功能测试"
)

# 测试视频路径（从仓库根目录运行）
REPO_ROOT = Path(__file__).parent.parent.parent.parent
TEST_VIDEO = REPO_ROOT / "test_video" / "birds.mp4"

# 若测试视频不存在，标记整个模块为跳过
if not TEST_VIDEO.exists():
    pytestmark = pytest.mark.skip(
        reason=f"测试视频不存在: {TEST_VIDEO}，请从仓库根目录运行"
    )


from video_converter import VideoConverter, OutputFormat
from video_converter.exceptions import VideoConverterError


class TestVideoConverter:
    """视频转换器端到端测试"""

    @pytest.fixture(autouse=True)
    def tmp_dir(self, tmp_path):
        """每个测试使用独立临时目录"""
        self.output_dir = tmp_path
        yield

    def test_get_video_info(self):
        """测试视频信息解析"""
        converter = VideoConverter()
        info = converter.get_video_info(str(TEST_VIDEO))

        assert info.width > 0, "宽度必须大于 0"
        assert info.height > 0, "高度必须大于 0"
        assert info.frame_rate > 0, "帧率必须大于 0"
        assert info.frame_count > 0, "帧数必须大于 0"
        assert info.duration > 0, "时长必须大于 0"
        assert info.codec != "", "编码不能为空"

        print(f"\n  视频信息: {info.width}x{info.height} @ {info.frame_rate:.2f}fps, "
              f"{info.frame_count}帧, {info.duration:.2f}秒, 编码={info.codec}")

    def test_convert_to_mjpeg(self):
        """测试转换为 MJPEG 格式"""
        converter = VideoConverter()
        output_path = str(self.output_dir / "output.mjpeg")

        result = converter.convert(
            input_path=str(TEST_VIDEO),
            output_path=output_path,
            output_format=OutputFormat.MJPEG,
            quality=5
        )

        assert result.success, "转换必须成功"
        assert os.path.exists(output_path), "输出文件必须存在"
        assert os.path.getsize(output_path) > 0, "输出文件不能为空"
        assert result.frame_count > 0, "帧数必须大于 0"

        # 验证 MJPEG 内容：以 JPEG SOI 标记开始
        with open(output_path, "rb") as f:
            header = f.read(2)
        assert header == b"\xff\xd8", f"MJPEG 文件应以 0xFFD8 开始，实际: {header.hex()}"

        print(f"\n  MJPEG 输出: {os.path.getsize(output_path)} 字节, {result.frame_count} 帧")

    def test_convert_to_avi_mjpeg(self):
        """测试转换为 AVI-MJPEG 格式"""
        converter = VideoConverter()
        output_path = str(self.output_dir / "output.avi")

        result = converter.convert(
            input_path=str(TEST_VIDEO),
            output_path=output_path,
            output_format=OutputFormat.AVI_MJPEG,
            quality=5
        )

        assert result.success, "转换必须成功"
        assert os.path.exists(output_path), "输出文件必须存在"
        assert os.path.getsize(output_path) > 0, "输出文件不能为空"

        # 验证 AVI 内容：以 RIFF 开始
        with open(output_path, "rb") as f:
            header = f.read(4)
        assert header == b"RIFF", f"AVI 文件应以 RIFF 开始，实际: {header.hex()}"

        print(f"\n  AVI-MJPEG 输出: {os.path.getsize(output_path)} 字节")

    def test_convert_to_h264(self):
        """测试转换为 H264 格式"""
        converter = VideoConverter()
        output_path = str(self.output_dir / "output.h264")

        result = converter.convert(
            input_path=str(TEST_VIDEO),
            output_path=output_path,
            output_format=OutputFormat.H264,
            quality=23
        )

        assert result.success, "转换必须成功"
        assert os.path.exists(output_path), "输出文件必须存在"
        assert os.path.getsize(output_path) > 0, "输出文件不能为空"

        # 验证头部：32 字节自定义头
        file_size = os.path.getsize(output_path)
        assert file_size > 32, f"H264 文件应大于 32 字节（头部），实际: {file_size}"

        print(f"\n  H264 输出: {file_size} 字节")

    def test_convert_with_framerate(self):
        """测试指定帧率转换"""
        converter = VideoConverter()
        output_path = str(self.output_dir / "output_fps.avi")

        result = converter.convert(
            input_path=str(TEST_VIDEO),
            output_path=output_path,
            output_format=OutputFormat.AVI_MJPEG,
            frame_rate=10.0,  # 强制 10fps
            quality=10
        )

        assert result.success, "转换必须成功"
        assert abs(result.frame_rate - 10.0) < 0.1, f"帧率应为 10fps，实际: {result.frame_rate}"

        print(f"\n  指定帧率输出: {result.frame_rate:.2f}fps")

    def test_progress_callback(self):
        """测试进度回调"""
        progress_calls = []

        def on_progress(current: int, total: int):
            progress_calls.append((current, total))

        converter = VideoConverter(progress_callback=on_progress)
        output_path = str(self.output_dir / "output_cb.avi")

        converter.convert(
            input_path=str(TEST_VIDEO),
            output_path=output_path,
            output_format=OutputFormat.AVI_MJPEG,
            quality=10
        )

        assert len(progress_calls) > 0, "进度回调必须被调用"
        print(f"\n  进度回调次数: {len(progress_calls)}")

    def test_invalid_input(self):
        """测试无效输入文件处理"""
        converter = VideoConverter()

        with pytest.raises(FileNotFoundError):
            converter.convert(
                input_path="nonexistent_file.mp4",
                output_path=str(self.output_dir / "output.avi"),
                output_format=OutputFormat.AVI_MJPEG
            )
