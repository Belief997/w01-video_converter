# 图片转 JPEG 转换器 — 功能测试说明

## 概述

本目录包含 `image-to-jpeg-converter` 模块的**端到端功能测试**，验证实际 FFmpeg 转换流程及二进制头部正确性。

> ⚠️ 功能测试依赖真实的 FFmpeg 和测试图片文件，默认被标记为 `skip`。

---

## 前置条件

1. **FFmpeg 已安装**（命令行可用）
   ```bash
   ffmpeg -version
   ```

2. **测试图片存在**
   ```
   test_image/ac_cold.png   # 相对于仓库根目录
   ```

3. **已编译**
   ```bash
   cd image-to-jpeg-converter && npm run build
   ```

---

## 运行方式

```bash
# 进入模块目录
cd image-to-jpeg-converter

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
| `基本转换 (420)` | 输出文件存在，头部正确，JPEG 数据有效 |
| `高质量 (444)` | 采样格式 4:4:4 转换成功 |
| `灰度 (400)` | 采样格式灰度转换成功 |
| `头部 spec v4 验证` | 字节 0=0x00，字节 1=0x0C，宽高正确，其余为 0 |
| `size 字段验证` | size 字段等于 JPEG 数据实际大小 |
| `dummy 字段验证` | dummy 字段等于 0 |
| `无效输入处理` | 输入文件不存在时抛出错误 |

---

## 输出头部格式验证

测试会精确验证输出 `.bin` 文件的每个头部字节：

```
字节 0:    0x00  (所有位字段为 0)
字节 1:    0x0C  (type = 12, JPEG)
字节 2-3:  图片宽度 (uint16 LE)
字节 4-5:  图片高度 (uint16 LE)
字节 6:    0x00  (version)
字节 7:    0x00  (rsvd2)
字节 8-11: JPEG 大小 (uint32 LE)
字节 12-15: 0x00000000 (dummy)
字节 16+:  0xFFD8...  (JPEG 数据)
```

---

## 预期输出

```
✓ 基本转换 (4:2:0, 质量 5)
✓ 高质量转换 (4:4:4, 质量 2)
✓ 灰度转换 (4:0:0, 质量 10)
✓ 头部 spec v4 合规验证
✓ JPEG size 字段验证
✓ dummy 字段验证
✓ 无效输入文件处理
```
