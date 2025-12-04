# 实现计划

- [x] 1. 项目初始化和基础结构



  - [x] 1.1 创建项目目录结构和 __init__.py 文件

    - 创建 video_converter/ 目录及子目录 encoders/、writers/
    - 创建所有 __init__.py 文件
    - _需求: 6.1_

  - [x] 1.2 创建数据模型和异常定义

    - 实现 models.py（VideoInfo、ConversionResult、OutputFormat、MjpegFrame）
    - 实现 exceptions.py（VideoConverterError 及子类）
    - _需求: 1.4, 6.2, 6.3_
  - [x] 1.3 创建 requirements.txt 依赖文件


    - 添加 opencv-python、numpy、Pillow、hypothesis、pytest
    - _需求: 无_


- [x] 2. 视频解析器实现


  - [x] 2.1 实现 VideoParser 类

    - 使用 OpenCV VideoCapture 解析视频信息
    - 返回 VideoInfo 对象
    - 处理文件不存在和格式不支持的错误
    - _需求: 1.1, 1.2, 1.3, 1.4_
  - [ ]* 2.2 编写 VideoParser 属性测试
    - **Property 1: 视频信息结构完整性**
    - **Property 2: 不存在文件的错误处理**
    - **验证: 需求 1.2, 1.4**


- [x] 3. JPEG 编码器实现

  - [x] 3.1 实现 JpegEncoder 类


    - 使用 OpenCV 编码 JPEG（YUV420 Baseline）
    - 支持质量参数（1-100）
    - _需求: 2.1, 2.3, 3.3_
  - [ ]* 3.2 编写 JpegEncoder 属性测试
    - **Property 3: JPEG Baseline 编码验证**
    - **Property 5: JPEG 质量参数有效性**
    - **验证: 需求 2.1, 2.3**



- [x] 4. 帧提取器实现

  - [x] 4.1 实现 FrameExtractor 类

    - 从视频中提取帧
    - 支持帧率重采样
    - 实现迭代器接口
    - _需求: 2.2, 3.2, 4.2_
  - [ ]* 4.2 编写 FrameExtractor 属性测试
    - **Property 4: 帧率重采样正确性**
    - **验证: 需求 2.2, 3.2, 4.2**


- [-] 5. 检查点 - 确保所有测试通过


  - 确保所有测试通过，如有问题请询问用户。

- [ ] 6. MJPEG 写入器实现
  - [x] 6.1 实现 MjpegWriter 类

    - 将 JPEG 帧写入临时目录
    - 管理帧文件命名
    - _需求: 2.4_

  - [ ] 6.2 实现 MJPEG 解析功能
    - 解析 MJPEG 文件提取帧和偏移信息
    - 支持往返测试
    - _需求: 8.1, 8.2_
  - [ ]* 6.3 编写 MjpegWriter 属性测试
    - **Property 6: MJPEG 8 字节对齐**
    - **Property 13: MJPEG 往返一致性**
    - **验证: 需求 2.5, 8.3**

- [-] 7. AVI 写入器实现


  - [x] 7.1 实现 AviWriter 类

    - 使用 OpenCV VideoWriter 生成 AVI 文件
    - 设置 MJPEG 编码和帧率
    - _需求: 3.1, 3.2_
  - [ ]* 7.2 编写 AviWriter 属性测试
    - **Property 7: AVI-MJPEG 8 字节对齐**
    - **验证: 需求 3.5**



- [ ] 8. H264 编码器和写入器实现
  - [x] 8.1 实现 H264Encoder 类

    - 实现 16 像素对齐（填充黑色）
    - 使用 OpenCV 进行 H264 编码
    - 支持 CRF 参数
    - _需求: 4.1, 4.3, 4.5_

  - [ ] 8.2 实现 H264Writer 类
    - 写入原始 H264 流文件
    - _需求: 4.1_
  - [ ]* 8.3 编写 H264 属性测试
    - **Property 8: H264 尺寸 16 对齐**
    - **Property 9: 宽高比保持**
    - **验证: 需求 4.3, 7.3**

- [ ] 9. 检查点 - 确保所有测试通过
  - 确保所有测试通过，如有问题请询问用户。


- [-] 10. 后处理器实现

  - [x] 10.1 实现 PostProcessor 类

    - 实现 process_mjpeg 方法调用 mkMJPEG.py
    - 实现 process_avi 方法依次调用两个 AVI 处理脚本
    - 实现 process_h264 方法调用 h264_pack.py
    - _需求: 2.4, 3.4, 4.4_



- [ ] 11. 主转换器实现
  - [x] 11.1 实现 VideoConverter 类

    - 实现 get_video_info 方法
    - 实现 convert 方法，协调各组件完成转换
    - 实现进度回调机制
    - _需求: 1.1, 2.1-2.5, 3.1-3.5, 4.1-4.5, 6.1-6.4_
  - [ ]* 11.2 编写 VideoConverter 属性测试
    - **Property 10: API 返回结构完整性**
    - **Property 11: 无效参数异常处理**
    - **Property 12: 进度回调单调递增**
    - **Property 15: 可选参数传递正确性**
    - **验证: 需求 6.2, 6.3, 6.4, 5.5**



- [ ] 12. 命令行接口实现
  - [x] 12.1 实现 CLI 模块

    - 使用 argparse 解析命令行参数
    - 实现帮助信息显示
    - 实现转换摘要输出
    - _需求: 5.1, 5.2, 5.3, 5.4, 5.5_
  - [ ]* 12.2 编写 CLI 属性测试
    - **Property 14: CLI 无效参数错误处理**
    - **验证: 需求 5.3**

- [ ] 13. 最终检查点 - 确保所有测试通过
  - 确保所有测试通过，如有问题请询问用户。

- [-] 14. 集成和文档



  - [ ] 14.1 创建 __main__.py 入口点
    - 支持 `python -m video_converter` 调用

    - _需求: 5.1_
  - [ ] 14.2 更新模块导出
    - 在 __init__.py 中导出公共 API
    - _需求: 6.1_
