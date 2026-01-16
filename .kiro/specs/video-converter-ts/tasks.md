# Implementation Plan: Video Converter TypeScript

## Overview

将 Python 视频转换器重构为 TypeScript 版本。实现顺序：先建立基础设施（模型、错误、工具函数），然后实现核心模块（解析器、命令构建器、执行器），接着实现后处理器，最后实现主转换器和 CLI。

## Tasks

- [x] 1. 项目初始化和基础设施
  - [x] 1.1 创建项目结构和配置文件
    - 创建 `video-converter-ts/` 目录
    - 初始化 `package.json`，添加依赖：typescript, vitest, fast-check, commander
    - 创建 `tsconfig.json` 配置
    - 创建 `src/` 和 `tests/` 目录结构
    - _Requirements: 10.1, 10.5, 10.6_

  - [x] 1.2 实现数据模型 (models.ts)
    - 定义 `OutputFormat` 枚举
    - 定义 `VideoInfo` 接口
    - 定义 `ConversionResult` 接口
    - 定义 `ProgressCallback` 类型
    - 定义 `ConversionOptions` 接口
    - _Requirements: 10.6_

  - [x] 1.3 实现异常类 (errors.ts)
    - 实现 `VideoConverterError` 基类
    - 实现 `VideoFormatError`
    - 实现 `FFmpegNotFoundError`
    - 实现 `FFmpegError`
    - 实现 `PostProcessError`
    - _Requirements: 10.5_

- [x] 2. 视频解析器模块
  - [x] 2.1 实现 VideoParser 类 (parser.ts)
    - 实现 `checkFfprobeAvailable()` 方法
    - 实现 `runFfprobe()` 方法，执行 ffprobe 命令并解析 JSON 输出
    - 实现 `findVideoStream()` 方法
    - 实现 `parseFrameRate()` 方法，支持分数和小数格式
    - 实现 `parseFrameCount()` 方法，支持从 nb_frames 或 duration*fps 计算
    - 实现 `parse()` 主方法
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [ ]* 2.2 编写 VideoParser 属性测试
    - **Property 1: Frame Rate Parsing**
    - **Property 2: Frame Count Calculation**
    - **Validates: Requirements 1.5, 1.6**

- [x] 3. FFmpeg 命令构建器模块
  - [x] 3.1 实现 FFmpegBuilder 类 (ffmpeg-builder.ts)
    - 定义 H264_X264_PARAMS 常量（与 Python 版本相同）
    - 实现 `buildMjpegFramesCmd()` 方法
    - 实现 `buildAviCmd()` 方法
    - 实现 `buildH264Cmd()` 方法
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ]* 3.2 编写 FFmpegBuilder 属性测试
    - **Property 3: FFmpeg Command Structure**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**

- [x] 4. FFmpeg 命令执行器模块
  - [x] 4.1 实现 FFmpegExecutor 类 (ffmpeg-executor.ts)
    - 实现 `checkFfmpegAvailable()` 静态方法
    - 实现 `checkFfprobeAvailable()` 静态方法
    - 实现 `executeSimple()` 私有方法
    - 实现 `executeWithProgress()` 私有方法，解析 stderr 中的 frame= 进度
    - 实现 `execute()` 主方法，自动添加 -y 标志
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 4.2 编写 FFmpegExecutor 属性测试
    - **Property 4: Progress Callback Parsing**
    - **Property 5: Command Overwrite Flag**
    - **Validates: Requirements 3.4, 3.5**

- [ ] 5. Checkpoint - 核心模块验证
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. MJPEG 后处理器模块
  - [x] 6.1 实现 MjpegPacker 类 (postprocess/mjpeg-packer.ts)
    - 实现 `calculatePadding()` 方法
    - 实现 `isBaselineJpeg()` 方法，检测 SOF0 (0xFFC0) 标记
    - 实现 `findApp1InsertPosition()` 方法
    - 实现 `padJpegViaApp1()` 方法，扩展或插入 APP1 段
    - 实现 `pack()` 主方法，读取目录、排序、打包
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ]* 6.2 编写 MjpegPacker 属性测试
    - **Property 6: JPEG 8-Byte Alignment**
    - **Property 7: MJPEG Concatenation Integrity**
    - **Validates: Requirements 4.3, 4.4, 4.5, 4.1, 4.6**

- [x] 7. AVI 后处理器模块
  - [x] 7.1 实现 AviAligner 类 (postprocess/avi-aligner.ts)
    - 实现 `readChunkHeader()` 方法
    - 实现 `findRootChunks()` 方法，解析 RIFF 结构
    - 实现 `findMoviChunks()` 方法
    - 实现 `alignFirstFrame()` 方法，调整 JUNK 块大小
    - 实现 `alignAllFrames()` 方法，通过 APP1 填充对齐每帧
    - 实现 `process()` 主方法，依次调用两步处理
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [ ]* 7.2 编写 AviAligner 属性测试
    - **Property 8: AVI Frame Alignment**
    - **Property 9: AVI Data Integrity**
    - **Validates: Requirements 5.2, 5.3, 5.4, 5.1, 5.6**

- [x] 8. H264 后处理器模块
  - [x] 8.1 实现 BitReader 类 (postprocess/h264-packer.ts)
    - 实现 `readBits()` 方法
    - 实现 `readBit()` 方法
    - 实现 `readUe()` 方法 (Exp-Golomb 无符号)
    - 实现 `readSe()` 方法 (Exp-Golomb 有符号)
    - _Requirements: 6.1, 6.2_

  - [x] 8.2 实现 H264Packer 类 (postprocess/h264-packer.ts)
    - 实现 `findStartCodePos()` 方法，查找 0x000001 或 0x00000001
    - 实现 `nextNalBounds()` 方法
    - 实现 `ebspToRbsp()` 方法，移除防竞争字节
    - 实现 `parseSpsPayload()` 方法，解析 SPS 获取分辨率
    - 实现 `parseSliceHeaderFields()` 方法
    - 实现 `countFrames()` 方法，使用 AUD 或 first_mb_in_slice 计数
    - 实现 `buildHeader()` 方法，构建 24 字节头部
    - 实现 `pack()` 主方法
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 8.3 编写 H264Packer 属性测试
    - **Property 10: EBSP to RBSP Conversion**
    - **Property 11: H264 Header Format**
    - **Property 12: H264 Output Structure**
    - **Validates: Requirements 6.2, 6.4, 6.5**

- [ ] 9. Checkpoint - 后处理器验证
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. 视频转换器主模块
  - [x] 10.1 实现 VideoConverter 类 (converter.ts)
    - 实现构造函数，接受可选的 progressCallback
    - 实现 `getVideoInfo()` 方法
    - 实现 `convertToMjpeg()` 私有方法
    - 实现 `convertToAviMjpeg()` 私有方法
    - 实现 `convertToH264()` 私有方法
    - 实现 `convert()` 主方法，包含临时文件清理逻辑
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 10.2, 10.3, 10.4_

  - [ ]* 10.2 编写 VideoConverter 属性测试
    - **Property 13: Temp File Cleanup**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.5**

- [x] 11. 命令行接口模块
  - [x] 11.1 实现 CLI 模块 (cli.ts)
    - 使用 commander 库定义命令行参数
    - 实现 `parseArgs()` 函数
    - 实现 `printVideoInfo()` 函数
    - 实现 `printProgress()` 函数
    - 实现 `printResult()` 函数
    - 实现 `main()` 函数
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

  - [ ]* 11.2 编写 CLI 属性测试
    - **Property 14: CLI Argument Parsing**
    - **Validates: Requirements 8.1, 8.3, 8.4**

- [x] 12. 跨平台兼容性
  - [x] 12.1 实现平台检测和路径处理
    - 在 parser.ts 和 ffmpeg-executor.ts 中使用 `process.platform` 检测平台
    - 使用 `path.join()` 处理所有文件路径
    - 确保路径分隔符兼容性
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [ ]* 12.2 编写跨平台属性测试
    - **Property 15: Platform Command Names**
    - **Property 16: Path Separator Handling**
    - **Validates: Requirements 9.1, 9.2, 9.4**

- [x] 13. 公共 API 导出
  - [x] 13.1 实现 index.ts 导出
    - 导出 `VideoConverter` 类
    - 导出所有数据模型类型
    - 导出所有异常类
    - _Requirements: 10.1, 10.5, 10.6_

- [x] 14. Final Checkpoint - 完整测试
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- 任务标记 `*` 的为可选测试任务，可跳过以加快 MVP 开发
- 每个属性测试应至少运行 100 次迭代
- 后处理器的实现需要严格遵循 Python 版本的逻辑，确保输出一致
- H264 SPS 解析是最复杂的部分，需要仔细处理各种 profile 的差异
