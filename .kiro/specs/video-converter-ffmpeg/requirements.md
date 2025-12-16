# 需求文档

## 简介

本文档定义了基于 FFmpeg 的视频转换工具的需求规格。该工具使用系统环境中的 ffmpeg 命令行工具将常见视频格式（如 MP4）转换为三种目标格式：MJPEG 视频流、AVI 封装的 MJPEG 视频、以及 H264 视频。转换过程分为两步：第一步使用 ffmpeg 进行格式转换，第二步调用现有的后处理脚本完成最终的格式封装和对齐处理。该工具兼容 Linux 和 Windows 环境。

## 术语表

- **Video_Converter**: 视频转换工具系统，负责协调 ffmpeg 转换和后处理脚本
- **FFmpeg**: 开源多媒体处理工具，用于视频格式转换
- **MJPEG**: Motion JPEG 视频编码格式，每帧独立压缩为 JPEG 图像
- **AVI**: Audio Video Interleave，一种多媒体容器格式
- **H264**: 高效视频编码标准，也称为 MPEG-4 AVC
- **YUV420P/YUVJ420P**: 视频像素格式，使用 4:2:0 色度子采样
- **Frame_Rate**: 帧率，每秒显示的帧数（FPS）
- **Quality_Level**: 质量等级，MJPEG/AVI 使用 1-31（1 最高），H264 使用 CRF 值
- **Post_Processor**: 后处理脚本，用于完成最终的格式封装和对齐

## 需求

### 需求 1

**用户故事：** 作为开发者，我希望能够解析输入视频的基本信息，以便了解视频的属性并进行后续转换。

#### 验收标准

1. WHEN 用户提供一个视频文件路径 THEN Video_Converter SHALL 使用 ffprobe 解析并返回视频的宽度、高度、帧率和总帧数信息
2. WHEN 用户提供一个不存在的文件路径 THEN Video_Converter SHALL 返回明确的文件不存在错误信息
3. WHEN 用户提供一个非视频格式的文件 THEN Video_Converter SHALL 返回明确的格式不支持错误信息
4. WHEN 解析视频信息成功 THEN Video_Converter SHALL 返回一个包含所有视频属性的结构化数据对象

### 需求 2

**用户故事：** 作为开发者，我希望将视频转换为 MJPEG 格式，以便在需要 Motion JPEG 流的系统中使用。

#### 验收标准

1. WHEN 用户指定 MJPEG 作为输出格式 THEN Video_Converter SHALL 使用 ffmpeg 命令 `-vf "format=yuvj420p"` 将每帧提取为 YUV420P JPEG 文件
2. WHEN 用户指定自定义帧率 THEN Video_Converter SHALL 使用 ffmpeg 的 `-r` 参数按照指定帧率对视频进行重采样
3. WHEN 用户指定 Quality_Level（1-31）THEN Video_Converter SHALL 使用 ffmpeg 的 `-q:v` 参数设置 JPEG 质量
4. WHEN JPEG 帧文件生成完成 THEN Video_Converter SHALL 调用 script/mkMJPEG.py 脚本将帧文件打包为 MJPEG 视频流
5. WHEN 打包完成 THEN Video_Converter SHALL 确保输出的 MJPEG 文件中每个 JPEG 帧起始地址 8 字节对齐

### 需求 3

**用户故事：** 作为开发者，我希望将视频转换为 AVI 封装的 MJPEG 格式，以便在需要 AVI 容器的应用中使用。

#### 验收标准

1. WHEN 用户指定 AVI-MJPEG 作为输出格式 THEN Video_Converter SHALL 使用 ffmpeg 命令 `-an -vcodec mjpeg -pix_fmt yuvj420p` 生成无音频的 AVI 文件
2. WHEN 用户指定自定义帧率 THEN Video_Converter SHALL 使用 ffmpeg 的 `-r` 参数设置目标帧率
3. WHEN 用户指定 Quality_Level（1-31）THEN Video_Converter SHALL 使用 ffmpeg 的 `-q:v` 参数设置 JPEG 质量
4. WHEN AVI 文件生成完成 THEN Video_Converter SHALL 依次调用 script/procAVI_no_audio_first.py 和 script/procAVI_no_audio_second.py 进行后处理
5. WHEN 后处理完成 THEN Video_Converter SHALL 确保 AVI 文件中每个 JPEG 帧数据起始地址 8 字节对齐

### 需求 4

**用户故事：** 作为开发者，我希望将视频转换为 H264 格式，以便生成高压缩比的视频文件。

#### 验收标准

1. WHEN 用户指定 H264 作为输出格式 THEN Video_Converter SHALL 使用 ffmpeg 命令 `-c:v libx264 -an -f rawvideo` 生成 H264 编码的原始视频流文件
2. WHEN 用户指定自定义帧率 THEN Video_Converter SHALL 使用 ffmpeg 的 `-r` 参数设置输入帧率
3. WHEN 转换 H264 视频 THEN Video_Converter SHALL 使用 x264-params 参数 `cabac=0:bframes=0:keyint=40:min-keyint=4:crf=23` 等进行编码
4. WHEN H264 文件生成完成 THEN Video_Converter SHALL 调用 script/h264_pack.py 脚本添加自定义头部信息
5. WHEN 用户指定 CRF 值 THEN Video_Converter SHALL 在 x264-params 中使用指定的 CRF 值控制编码质量

### 需求 5

**用户故事：** 作为开发者，我希望通过命令行使用视频转换工具，以便将其集成到脚本和自动化工作流中。

#### 验收标准

1. WHEN 用户从命令行调用 Video_Converter THEN Video_Converter SHALL 接受输入文件路径、输出文件路径和输出格式作为必需参数
2. WHEN 用户提供 help 标志 THEN Video_Converter SHALL 显示使用说明，包括所有可用选项及其描述
3. WHEN 用户提供无效参数 THEN Video_Converter SHALL 显示明确的错误信息指出问题所在
4. WHEN 转换成功完成 THEN Video_Converter SHALL 显示转换摘要，包括输入文件、输出文件和使用的转换参数
5. WHEN 用户指定可选参数（帧率、质量等）THEN Video_Converter SHALL 使用指定的参数值进行转换

### 需求 6

**用户故事：** 作为开发者，我希望将视频转换工具作为 Python 库使用，以便在应用程序中以编程方式集成视频转换功能。

#### 验收标准

1. WHEN 开发者导入 Video_Converter 模块 THEN Video_Converter SHALL 暴露用于视频转换操作的公共 API
2. WHEN 开发者使用有效参数调用转换函数 THEN Video_Converter SHALL 返回包含转换状态和输出文件信息的结果对象
3. WHEN 开发者使用无效参数调用转换函数 THEN Video_Converter SHALL 抛出带有描述性错误信息的适当异常
4. WHEN 开发者需要监控转换进度 THEN Video_Converter SHALL 提供进度回调机制

### 需求 7

**用户故事：** 作为开发者，我希望工具能够在 Linux 和 Windows 环境中正常工作，以便在不同操作系统上使用。

#### 验收标准

1. WHEN Video_Converter 在 Linux 环境运行 THEN Video_Converter SHALL 正确调用系统 PATH 中的 ffmpeg 和 ffprobe 命令
2. WHEN Video_Converter 在 Windows 环境运行 THEN Video_Converter SHALL 正确调用系统 PATH 中的 ffmpeg.exe 和 ffprobe.exe 命令
3. WHEN ffmpeg 未安装或不在 PATH 中 THEN Video_Converter SHALL 返回明确的错误信息提示用户安装 ffmpeg
4. WHEN 处理文件路径 THEN Video_Converter SHALL 正确处理不同操作系统的路径分隔符

### 需求 8

**用户故事：** 作为开发者，我希望能够序列化和反序列化 MJPEG 视频数据，以便通过往返测试验证转换的完整性。

#### 验收标准

1. WHEN Video_Converter 解析 MJPEG 文件 THEN Video_Converter SHALL 提取各个 JPEG 帧及其偏移信息
2. WHEN Video_Converter 写入 MJPEG 数据 THEN Video_Converter SHALL 生成可被解析回原始帧数据的输出
3. WHEN 对 MJPEG 数据执行解析后再写入操作 THEN Video_Converter SHALL 通过往返操作保持帧内容的完整性
