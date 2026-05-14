# TypeScript 视频转换器 — 功能测试说明

## 概述

本目录包含 `video-converter-ts` 模块的**端到端功能测试**，验证实际 FFmpeg 转换流程。

> ⚠️ 功能测试依赖真实的 FFmpeg 和测试视频文件，默认被标记为 `skip`。

---

## 前置条件

1. **FFmpeg 已安装**（命令行可用）
   ```bash
   ffmpeg -version
   ```

2. **测试视频存在**
   ```
   test_video/birds.mp4   # 相对于仓库根目录
   ```

3. **已编译**
   ```bash
   cd video-converter-ts && npm run build
   ```

---

## 运行方式

```bash
# 进入模块目录
cd video-converter-ts

# 运行功能测试（需要 FFmpeg）
npm test -- --run tests/functional/functional.test.ts

# 运行所有测试（含单元测试）
npm test -- --run
```

若 FFmpeg 未安装，功能测试会被自动跳过，单元测试正常执行。

---

## 测试内容

| 测试 | 验证点 |
|------|--------|
| `getVideoInfo` | 解析视频分辨率、帧率、帧数、时长 |
| `convert → MJPEG` | 输出文件存在，以 `0xFFD8` 开始 |
| `convert → AVI_MJPEG` | 输出文件存在，以 `RIFF` 开始 |
| `convert → H264` | 输出文件存在，大于 32 字节 |
| `convert with frameRate` | 指定帧率结果正确 |
| `invalid input` | 抛出对应错误 |

---

## 预期输出

```
✓ getVideoInfo - 解析视频信息
✓ convert - MJPEG 格式
✓ convert - AVI-MJPEG 格式
✓ convert - H264 格式
✓ convert - 指定帧率
✓ convert - 无效输入文件
```
