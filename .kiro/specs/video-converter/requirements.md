# 需求文档

## 简介

本文档定义了一个纯 Python 实现的视频转换工具的需求规格。该工具能够将常见视频格式（如 MP4）转换为三种目标格式：MJPEG 视频流、AVI 封装的 MJPEG 视频、以及 H264 视频。转换过程不依赖外部程序（如 ffmpeg），完全使用 Python 实现。转换完成后，工具将调用现有的后处理脚本完成最终的格式封装和对齐处理。

## 术语表

- **Video_Converter**: 视频转换工具系统，负责执行视频格式转换操作
- **MJPEG**: Motion JPEG 视频编码格式，每帧独立压缩为 JPEG 图像
- **AVI**: Audio Video Interleave，一种多媒体容器格式
- **H264**: 高效视频编码标准，也称为 MPEG-4 AVC
- **YUV420P/YUVJ420P**: 视频像素格式，使用 4:2:0 色度子采样
- **Baseline_JPEG**: JPEG 基线编码模式（SOF0，标记 0xFFC0）
- **Frame_Rate**: 帧率，每秒显示的帧数（FPS）
- **Quality_Level**: JPEG 编码质量等级（1-100）
- **Post_Processor**: 后处理脚本，用于完成最终的格式封装和对齐

## 需求

### 需求 1

**用户故事：** 作为开发者，我希望能够解析输入视频的基本信息，以便了解视频的属性并进行后续转换。

#### 验收标准

1. WHEN 用户提供一个视频文件路径 THEN Video_Converter SHALL 解析并返回视频的宽度、高度、帧率和总帧数信息
2. WHEN 用户提供一个不存在的文件路径 THEN Video_Converter SHALL 返回明确的文件不存在错误信息
3. WHEN 用户提供一个非视频格式的文件 THEN Video_Converter SHALL 返回明确的格式不支持错误信息
4. WHEN 解析视频信息成功 THEN Video_Converter SHALL 返回一个包含所有视频属性的结构化数据对象

### 需求 2

**用户故事：** 作为开发者，我希望将视频转换为 MJPEG 格式，以便在需要 Motion JPEG 流的系统中使用。

#### 验收标准

1. WHEN 用户指定 MJPEG 作为输出格式 THEN Video_Converter SHALL 将每帧编码为 YUV420 Baseline JPEG 格式并输出为独立的 JPEG 文件
2. WHEN 用户指定自定义帧率 THEN Video_Converter SHALL 按照指定帧率对视频进行重采样
3. WHEN 用户指定 Quality_Level（1-100）THEN Video_Converter SHALL 使用指定的质量值编码每帧 JPEG
4. WHEN JPEG 帧文件生成完成 THEN Video_Converter SHALL 调用 script/mkMJPEG.py 脚本将帧文件打包为 MJPEG 视频流
5. WHEN 打包完成 THEN Video_Converter SHALL 确保输出的 MJPEG 文件中每个 JPEG 帧起始地址 8 字节对齐

### 需求 3

**用户故事：** 作为开发者，我希望将视频转换为 AVI 封装的 MJPEG 格式，以便在需要 AVI 容器的应用中使用。

#### 验收标准

1. WHEN 用户指定 AVI-MJPEG 作为输出格式 THEN Video_Converter SHALL 生成无音频的 AVI 文件，视频帧使用 YUV420 Baseline JPEG 编码
2. WHEN 用户指定自定义帧率 THEN Video_Converter SHALL 按照指定帧率设置 AVI 文件的帧率元数据
3. WHEN 用户指定 Quality_Level THEN Video_Converter SHALL 使用指定的质量值编码每帧 JPEG
4. WHEN AVI 文件生成完成 THEN Video_Converter SHALL 依次调用 script/procAVI_no_audio_first.py 和 script/procAVI_no_audio_second.py 进行后处理
5. WHEN 后处理完成 THEN Video_Converter SHALL 确保 AVI 文件中每个 JPEG 帧数据起始地址 8 字节对齐
6. WHEN 编码 AVI 中的 JPEG 帧 THEN Video_Converter SHALL 确保每帧 JPEG 使用 Baseline_JPEG 编码模式（SOF0 标记）

### 需求 4

**用户故事：** 作为开发者，我希望将视频转换为 H264 格式，以便生成高压缩比的视频文件。

#### 验收标准

1. WHEN 用户指定 H264 作为输出格式 THEN Video_Converter SHALL 生成 H264 编码的原始视频流文件
2. WHEN 用户指定自定义帧率 THEN Video_Converter SHALL 按照指定帧率编码视频
3. WHEN 转换 H264 视频 THEN Video_Converter SHALL 确保视频画面宽度和高度均对齐到 16 像素，不足部分填充黑色
4. WHEN H264 文件生成完成 THEN Video_Converter SHALL 调用 script/h264_pack.py 脚本添加自定义头部信息
5. WHEN 用户指定 CRF 值 THEN Video_Converter SHALL 使用指定的 CRF 值控制编码质量

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

**用户故事：** 作为开发者，我希望转换工具能够兼容现有的 ffmpeg 转换参数，以便适配相同的解码器。

#### 验收标准

1. WHEN 转换为 AVI-MJPEG 格式 THEN Video_Converter SHALL 使用与 ffmpeg 命令 `-vcodec mjpeg -pix_fmt yuvj420p` 等效的编码参数
2. WHEN 转换为 H264 格式 THEN Video_Converter SHALL 使用与 ffmpeg 命令中 x264-params 等效的编码参数（cabac=0, bframes=0 等）
3. WHEN 转换视频 THEN Video_Converter SHALL 保持原始视频画面不进行裁剪或拉伸

### 需求 8

**用户故事：** 作为开发者，我希望能够序列化和反序列化 MJPEG 视频数据，以便通过往返测试验证转换的完整性。

#### 验收标准

1. WHEN Video_Converter 解析 MJPEG 文件 THEN Video_Converter SHALL 提取各个 JPEG 帧及其偏移信息
2. WHEN Video_Converter 写入 MJPEG 数据 THEN Video_Converter SHALL 生成可被解析回原始帧数据的输出
3. WHEN 对 MJPEG 数据执行解析后再写入操作 THEN Video_Converter SHALL 通过往返操作保持帧内容的完整性
