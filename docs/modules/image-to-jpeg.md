# 图片转 JPEG 转换器

**路径：** `image-to-jpeg-converter/`  
**入口：** `node dist/cli.js`  
**依赖：** Node.js 18+、FFmpeg  
**输出：** `.bin` 文件（JPEG + 自定义二进制头）

---

## 功能

将图片（PNG、JPG、WEBP、GIF、TIFF 等）转换为嵌入式 GUI 系统可用的 `.bin` 文件：
1. 使用 FFmpeg 将输入图片编码为指定采样格式和质量的 JPEG
2. 生成 16 字节二进制头部（`gui_rgb_data_head_t` + size + dummy）
3. 拼接头部与 JPEG 数据，输出 `.bin` 文件

---

## 安装与构建

```bash
cd image-to-jpeg-converter
npm install
npm run build   # 输出到 dist/
```

---

## CLI 用法

```bash
# 基本转换（4:2:0，质量 5）
node dist/cli.js -i test_image/ac_cold.png -o output.bin -s 420 -q 5

# 高质量（4:4:4，质量 2）
node dist/cli.js -i input.png -o output.bin -s 444 -q 2

# 灰度
node dist/cli.js -i input.png -o output.bin -s 400 -q 10

# 带透明度的 PNG（指定背景色）
node dist/cli.js -i input.png -o output.bin -s 420 -q 5 -b white
```

### 参数说明

| 参数 | 简写 | 说明 |
|------|------|------|
| `--input` | `-i` | 输入图片路径（必需） |
| `--output` | `-o` | 输出 `.bin` 文件路径（必需） |
| `--sampling` | `-s` | 采样格式：`400`/`420`/`422`/`444`（默认 `420`） |
| `--quality` | `-q` | JPEG 质量 1-31（数值越小质量越高，默认 `5`） |
| `--background` | `-b` | 透明区域背景色（默认 `black`） |

---

## API 用法

```typescript
import { convertToJpeg, SamplingFactor } from './dist/index.js';

const result = await convertToJpeg({
  inputPath: 'test_image/ac_cold.png',
  outputPath: 'output.bin',
  sampling: SamplingFactor.YUV420,   // 420
  quality: 5,
  background: 'black'
});
```

---

## 模块结构

```
image-to-jpeg-converter/src/
├── cli.ts              # 命令行入口
├── converter.ts        # convertToJpeg() 主函数
├── ffmpeg-executor.ts  # FFmpeg 调用（图片转 JPEG）
├── header-generator.ts # 生成 gui_rgb_data_head_t 和 gui_jpeg_file_head_t
├── file-assembler.ts   # 拼装 .bin 文件（头部 + JPEG 数据）
├── validator.ts        # 参数校验
├── types.ts            # 类型定义
└── index.ts            # 模块导出
```

---

## 二进制头部格式

严格遵循 `script/spec_v4.txt`：

```
字节 0:    0x00（所有位字段为 0）
字节 1:    0x0C（type = 12，JPEG）
字节 2-3:  宽度（uint16，小端序）
字节 4-5:  高度（uint16，小端序）
字节 6:    0x00（version = 0）
字节 7:    0x00（rsvd2 = 0）
字节 8-11: JPEG 大小（uint32，小端序）
字节 12-15: 0x00000000（dummy）
字节 16+:  JPEG 数据（从 0xFFD8 开始）
```

> **约束：** `gui_rgb_data_head_t` 只填充 `type`、`w`、`h`，其余全为 0。

参考头部示例：`000c 4800 4800 0000 0507 0000 0000 0000 ffd8 ffe0`

---

## 透明度处理

对于含透明通道的图片（PNG、WEBP 等），FFmpeg 命令自动添加背景色叠加滤镜：

```bash
ffmpeg -i input.png -f lavfi -i "color=black" \
  -filter_complex "[1:v][0:v]scale2ref[bg][fg];[bg][fg]overlay=format=auto" \
  -c:v mjpeg -pix_fmt yuvj420p -q:v 5 -frames:v 1 output.jpg
```

---

## 测试

```bash
npm test
npm run test:coverage
```

单元测试位于 `tests/unit/`，涵盖：
- `header-generator.test.ts` — 头部生成与二进制编码
- `file-assembler.test.ts` — 文件拼装逻辑
- `ffmpeg-executor.test.ts` — FFmpeg 命令构建
- `converter.test.ts` — 端到端转换流程
- `validator.test.ts` — 参数校验
