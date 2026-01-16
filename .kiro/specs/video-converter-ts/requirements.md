# Requirements Document

## Introduction

本文档定义了将现有 Python 视频转换器重构为 TypeScript 版本的需求。该工具基于 FFmpeg/FFprobe 命令行工具，支持将视频转换为 MJPEG、AVI-MJPEG 和 H264 三种输出格式，并对输出进行 8 字节对齐的后处理。重构需保持原有功能和逻辑不变，使用 Node.js 运行时。

## Glossary

- **Video_Converter**: 视频转换器主模块，协调解析、转换和后处理流程
- **Video_Parser**: 视频解析器，使用 ffprobe 获取视频元数据
- **FFmpeg_Builder**: FFmpeg 命令构建器，生成不同格式转换的命令参数
- **FFmpeg_Executor**: FFmpeg 命令执行器，运行 ffmpeg 命令并处理输出
- **Post_Processor**: 后处理器，对转换后的文件进行格式特定的处理
- **MJPEG_Packer**: MJPEG 打包器，将 JPEG 帧序列打包为 MJPEG 流
- **AVI_Aligner**: AVI 对齐器，对 AVI 文件进行 8 字节对齐处理
- **H264_Packer**: H264 打包器，为 H264 原始流添加自定义头部
- **CLI**: 命令行接口模块
- **VideoInfo**: 视频信息数据结构，包含宽度、高度、帧率、帧数等
- **ConversionResult**: 转换结果数据结构
- **OutputFormat**: 输出格式枚举（MJPEG、AVI_MJPEG、H264）

## Requirements

### Requirement 1: 视频信息解析

**User Story:** As a developer, I want to parse video metadata using ffprobe, so that I can obtain video properties for conversion.

#### Acceptance Criteria

1. WHEN a valid video file path is provided, THE Video_Parser SHALL execute ffprobe command and return VideoInfo containing width, height, frame_rate, frame_count, duration, and codec
2. WHEN the input file does not exist, THE Video_Parser SHALL throw a FileNotFoundError with descriptive message
3. WHEN ffprobe is not installed or not in PATH, THE Video_Parser SHALL throw an FFmpegNotFoundError
4. WHEN the file format is unsupported or corrupted, THE Video_Parser SHALL throw a VideoFormatError
5. WHEN parsing frame rate from ffprobe output, THE Video_Parser SHALL handle both fraction format (e.g., "30000/1001") and decimal format
6. WHEN nb_frames is not available in stream info, THE Video_Parser SHALL calculate frame count from duration and frame rate

### Requirement 2: FFmpeg 命令构建

**User Story:** As a developer, I want to build FFmpeg commands for different output formats, so that I can execute video conversions.

#### Acceptance Criteria

1. WHEN building MJPEG frames extraction command, THE FFmpeg_Builder SHALL generate command with format filter "yuvj420p" and quality parameter
2. WHEN building AVI-MJPEG conversion command, THE FFmpeg_Builder SHALL generate command with mjpeg codec, no audio flag, and quality parameter
3. WHEN building H264 conversion command, THE FFmpeg_Builder SHALL generate command with libx264 codec, x264-params, and rawvideo output format
4. WHEN frame rate is specified, THE FFmpeg_Builder SHALL include the -r parameter in the command
5. THE FFmpeg_Builder SHALL use the same x264-params string as the Python implementation for H264 encoding

### Requirement 3: FFmpeg 命令执行

**User Story:** As a developer, I want to execute FFmpeg commands and monitor progress, so that I can perform video conversions with feedback.

#### Acceptance Criteria

1. WHEN executing ffmpeg command, THE FFmpeg_Executor SHALL spawn a child process and capture stdout/stderr
2. WHEN ffmpeg is not installed or not in PATH, THE FFmpeg_Executor SHALL throw an FFmpegNotFoundError
3. WHEN ffmpeg returns non-zero exit code, THE FFmpeg_Executor SHALL throw an FFmpegError with command and error output
4. WHEN progress callback is provided, THE FFmpeg_Executor SHALL parse frame progress from stderr and invoke callback with current and total frames
5. THE FFmpeg_Executor SHALL add -y flag to overwrite output files without prompting

### Requirement 4: MJPEG 后处理

**User Story:** As a developer, I want to pack JPEG frames into an MJPEG stream with 8-byte alignment, so that the output meets hardware requirements.

#### Acceptance Criteria

1. WHEN processing JPEG frames, THE MJPEG_Packer SHALL read all JPEG files from input directory in sorted order
2. WHEN a JPEG is not baseline encoded (SOF0), THE MJPEG_Packer SHALL skip it and log a warning
3. WHEN JPEG size is not 8-byte aligned, THE MJPEG_Packer SHALL pad via APP1 segment
4. IF APP1 segment exists, THEN THE MJPEG_Packer SHALL extend its content with padding bytes
5. IF APP1 segment does not exist, THEN THE MJPEG_Packer SHALL insert a new APP1 segment with "EXIF" identifier and padding
6. WHEN writing output, THE MJPEG_Packer SHALL concatenate all padded JPEG frames into a single file

### Requirement 5: AVI 后处理

**User Story:** As a developer, I want to align AVI file frames to 8-byte boundaries, so that the output meets hardware requirements.

#### Acceptance Criteria

1. WHEN processing AVI file (first pass), THE AVI_Aligner SHALL parse RIFF structure and locate movi chunk
2. WHEN first frame data offset is not 8-byte aligned, THE AVI_Aligner SHALL adjust JUNK chunk size before movi
3. WHEN processing AVI file (second pass), THE AVI_Aligner SHALL align each frame by padding previous frame's APP1 segment
4. WHEN frame padding is applied, THE AVI_Aligner SHALL update movi chunk size, RIFF size, and idx1 offsets
5. IF no JUNK chunk exists before movi, THEN THE AVI_Aligner SHALL report error
6. THE AVI_Aligner SHALL preserve all chunk headers and data integrity during alignment

### Requirement 6: H264 后处理

**User Story:** As a developer, I want to add a custom header to H264 raw stream, so that the output contains metadata for playback.

#### Acceptance Criteria

1. WHEN processing H264 file, THE H264_Packer SHALL parse SPS NAL unit to extract width and height
2. WHEN parsing SPS, THE H264_Packer SHALL handle EBSP to RBSP conversion (remove emulation prevention bytes)
3. WHEN counting frames, THE H264_Packer SHALL detect frame boundaries using AUD NAL units or first_mb_in_slice field
4. THE H264_Packer SHALL create 24-byte header with format: "H264" (4 bytes) + width (4 bytes) + height (4 bytes) + frame_count (4 bytes) + frame_time_ms (4 bytes) + data_size (4 bytes)
5. WHEN writing output, THE H264_Packer SHALL prepend header to original H264 data

### Requirement 7: 视频转换主流程

**User Story:** As a developer, I want to convert videos to different formats through a unified API, so that I can easily integrate the converter.

#### Acceptance Criteria

1. WHEN converting to MJPEG format, THE Video_Converter SHALL extract frames to temp directory, call MJPEG_Packer, and clean up temp files
2. WHEN converting to AVI-MJPEG format, THE Video_Converter SHALL create temp AVI, call AVI_Aligner twice, and clean up temp files
3. WHEN converting to H264 format, THE Video_Converter SHALL create temp H264, call H264_Packer, and clean up temp files
4. WHEN conversion succeeds, THE Video_Converter SHALL return ConversionResult with success status and metadata
5. IF any step fails, THEN THE Video_Converter SHALL clean up temp files and throw appropriate error

### Requirement 8: 命令行接口

**User Story:** As a user, I want to use the converter from command line, so that I can convert videos without writing code.

#### Acceptance Criteria

1. WHEN -i/--input and -o/--output and -f/--format are provided, THE CLI SHALL execute conversion with specified parameters
2. WHEN --info flag is provided, THE CLI SHALL display video information without converting
3. WHEN -r/--framerate is provided, THE CLI SHALL use specified frame rate for conversion
4. WHEN -q/--quality is provided, THE CLI SHALL use specified quality value (1-31 for MJPEG/AVI, CRF for H264)
5. WHEN -v/--verbose is provided, THE CLI SHALL display progress during conversion
6. WHEN required arguments are missing, THE CLI SHALL display error message and usage help
7. WHEN conversion fails, THE CLI SHALL exit with non-zero code and display error message

### Requirement 9: 跨平台兼容性

**User Story:** As a developer, I want the converter to work on both Linux and Windows, so that I can use it in different environments.

#### Acceptance Criteria

1. WHEN running on Windows, THE system SHALL use "ffmpeg.exe" and "ffprobe.exe" command names
2. WHEN running on Linux, THE system SHALL use "ffmpeg" and "ffprobe" command names
3. THE system SHALL use path.join or equivalent for all file path operations
4. THE system SHALL handle both forward slash and backslash path separators

### Requirement 10: 编程 API

**User Story:** As a developer, I want to use the converter as a library, so that I can integrate it into my applications.

#### Acceptance Criteria

1. THE Video_Converter class SHALL be exported as the main entry point
2. THE Video_Converter SHALL accept optional progress callback in constructor
3. THE getVideoInfo method SHALL return Promise<VideoInfo>
4. THE convert method SHALL return Promise<ConversionResult>
5. All custom error types SHALL be exported for error handling
6. All data models (VideoInfo, ConversionResult, OutputFormat) SHALL be exported as TypeScript types
