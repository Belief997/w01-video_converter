# 实现计划

- [x] 1. 项目重构和基础结构





  - [x] 1.1 更新数据模型和异常定义


    - 更新 models.py（保持 VideoInfo、ConversionResult、OutputFormat、MjpegFrame）
    - 更新 exceptions.py（添加 FFmpegNotFoundError、FFmpegError）
    - _需求: 1.4, 6.2, 6.3, 7.3_


  - [x] 1.2 更新 requirements.txt 依赖文件

    - 移除 opencv-python、numpy、Pillow
    - 保留 hypothesis、pytest
    - _需求: 无_

- [x] 2. FFmpeg 命令构建器实现




  - [x] 2.1 实现 FFmpegBuilder 类


    - 实现 build_mjpeg_frames_cmd 方法
    - 实现 build_avi_cmd 方法
    - 实现 build_h264_cmd 方法
    - _需求: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 4.5_

  - [ ]* 2.2 编写 FFmpegBuilder 属性测试
    - **Property 3: FFmpeg 命令参数完整性**
    - **Property 4: 质量参数传递正确性**
    - **Property 5: 帧率参数传递正确性**
    - **验证: 需求 2.1-2.3, 3.1-3.3, 4.1-4.3, 4.5**

- [x] 3. FFmpeg 执行器实现






  - [x] 3.1 实现 FFmpegExecutor 类

    - 实现 check_ffmpeg_available 静态方法
    - 实现 execute 方法（支持进度回调）
    - 处理跨平台命令执行（Linux/Windows）
    - _需求: 7.1, 7.2, 7.3_

- [x] 4. 视频解析器重构






  - [x] 4.1 重构 VideoParser 类使用 ffprobe

    - 使用 ffprobe 命令解析视频信息
    - 返回 VideoInfo 对象
    - 处理文件不存在和格式不支持的错误
    - _需求: 1.1, 1.2, 1.3, 1.4_

  - [ ]* 4.2 编写 VideoParser 属性测试
    - **Property 1: 视频信息结构完整性**
    - **Property 2: 不存在文件的错误处理**
    - **验证: 需求 1.1, 1.2, 1.4**

- [x] 5. 检查点 - 确保所有测试通过


  - 确保所有测试通过，如有问题请询问用户。

- [x] 6. 主转换器重构



  - [x] 6.1 重构 VideoConverter 类

    - 使用 FFmpegBuilder 构建命令
    - 使用 FFmpegExecutor 执行命令
    - 实现 get_video_info 方法
    - 实现 convert 方法，协调 ffmpeg 转换和后处理
    - 实现进度回调机制
    - _需求: 1.1, 2.1-2.5, 3.1-3.5, 4.1-4.5, 6.1-6.4_

  - [ ]* 6.2 编写 VideoConverter 属性测试
    - **Property 8: API 返回结构完整性**
    - **Property 9: 无效参数异常处理**
    - **Property 10: 进度回调单调递增**
    - **Property 13: 可选参数传递正确性**
    - **验证: 需求 6.2, 6.3, 6.4, 5.5**

- [x] 7. MJPEG 解析器实现


  - [x] 7.1 实现 MjpegParser 类

    - 解析 MJPEG 文件提取帧和偏移信息
    - 支持往返测试验证
    - _需求: 8.1, 8.2_

  - [ ]* 7.2 编写 MJPEG 属性测试
    - **Property 6: MJPEG 8 字节对齐**
    - **Property 11: MJPEG 往返一致性**
    - **验证: 需求 2.5, 8.3**


- [x] 8. AVI 解析器更新



  - [x] 8.1 更新 AviParser 类

    - 保持现有 AVI 帧解析功能
    - 验证 8 字节对齐
    - _需求: 3.5_

  - [ ]* 8.2 编写 AVI 属性测试
    - **Property 7: AVI-MJPEG 8 字节对齐**
    - **验证: 需求 3.5**

- [x] 9. 检查点 - 确保所有测试通过


  - 确保所有测试通过，如有问题请询问用户。

- [x] 10. 后处理器更新


  - [x] 10.1 更新 PostProcessor 类


    - 保持现有后处理脚本调用逻辑
    - 确保跨平台兼容性
    - _需求: 2.4, 3.4, 4.4_

- [x] 11. 命令行接口更新


  - [x] 11.1 更新 CLI 模块


    - 更新质量参数范围说明（1-31）
    - 保持现有参数解析逻辑
    - _需求: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 11.2 编写 CLI 属性测试
    - **Property 12: CLI 无效参数错误处理**
    - **验证: 需求 5.3**

- [x] 12. 清理旧代码



  - [x] 12.1 移除不再需要的模块

    - 移除 video_converter/encoders/ 目录（不再需要 OpenCV 编码器）
    - 移除 video_converter/extractor.py（不再需要帧提取器）
    - 更新 __init__.py 导出
    - _需求: 无_

- [x] 13. 最终检查点 - 确保所有测试通过


  - 确保所有测试通过，如有问题请询问用户。
