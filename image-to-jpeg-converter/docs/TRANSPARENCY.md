# 透明度处理功能

## 概述

图片转 JPEG 转换器现在支持处理带透明度的图片格式（PNG、WEBP、GIF、TIFF 等）。当检测到可能包含透明度的图片格式时，转换器会自动使用 FFmpeg 的复合滤镜来处理透明区域。

## 支持的透明度格式

- **PNG** - 最常见的透明度格式
- **WEBP** - 现代 Web 格式，支持透明度
- **GIF** - 支持单色透明度
- **TIFF/TIF** - 专业图像格式，支持 Alpha 通道

## 工作原理

### 自动检测

转换器会根据文件扩展名自动检测可能包含透明度的格式：

```typescript
// 自动检测透明度格式
const hasTransparency = inputPath.toLowerCase().endsWith('.png') || 
                       inputPath.toLowerCase().endsWith('.webp') ||
                       // ... 其他格式
```

### FFmpeg 处理

对于透明度图片，使用以下 FFmpeg 命令结构：

```bash
ffmpeg -i input.png -f lavfi -i "color=black" \
  -filter_complex "[1:v][0:v]scale2ref[bg][fg];[bg][fg]overlay=format=auto" \
  -c:v mjpeg -pix_fmt yuvj420p -q:v 2 -frames:v 1 output.bin
```

**命令解释：**
- `-f lavfi -i "color=black"` - 创建纯色背景
- `scale2ref[bg][fg]` - 将背景缩放到与前景相同尺寸
- `overlay=format=auto` - 将前景叠加到背景上
- `-frames:v 1` - 输出单帧（静态图片）

## API 使用

### 基本用法（默认黑色背景）

```typescript
import { convertToJpeg, SamplingFactor } from './image-to-jpeg-converter';

const result = await convertToJpeg({
  inputPath: 'transparent.png',
  outputPath: 'output.bin',
  samplingFactor: SamplingFactor.YUV420,
  quality: 10
  // backgroundColor 默认为 'black'
});
```

### 自定义背景色

```typescript
// 白色背景
const result = await convertToJpeg({
  inputPath: 'transparent.png',
  outputPath: 'white_bg.bin',
  samplingFactor: SamplingFactor.YUV420,
  quality: 10,
  backgroundColor: 'white'
});

// 红色背景
const result = await convertToJpeg({
  inputPath: 'transparent.png',
  outputPath: 'red_bg.bin',
  samplingFactor: SamplingFactor.YUV422,
  quality: 8,
  backgroundColor: '#FF0000'
});

// 蓝色背景
const result = await convertToJpeg({
  inputPath: 'transparent.png',
  outputPath: 'blue_bg.bin',
  samplingFactor: SamplingFactor.YUV444,
  quality: 5,
  backgroundColor: '#0000FF'
});
```

### 支持的背景色格式

- **颜色名称**: `'black'`, `'white'`, `'red'`, `'green'`, `'blue'` 等
- **十六进制**: `'#FF0000'` (红色), `'#00FF00'` (绿色), `'#0000FF'` (蓝色)
- **RGB**: `'rgb(255,0,0)'` (红色)
- **RGBA**: `'rgba(255,0,0,1)'` (不透明红色)

## CLI 使用

CLI 工具会自动处理透明度，目前使用默认黑色背景：

```bash
# PNG 文件会自动使用透明度处理
node dist/cli.js -i transparent.png -o output.bin -s 420 -q 10

# 其他透明度格式也会自动处理
node dist/cli.js -i image.webp -o output.bin -s 422 -q 8
```

## 性能考虑

### 处理时间

透明度处理比普通转换稍慢，因为需要额外的复合操作：

- **普通转换**: ~500-1000ms
- **透明度处理**: ~1000-2000ms

### 内存使用

透明度处理需要更多内存来处理背景生成和叠加：

- **普通转换**: 基础内存使用
- **透明度处理**: 约 1.5-2 倍内存使用

## 最佳实践

### 1. 选择合适的背景色

```typescript
// 对于深色图片，使用白色背景
backgroundColor: 'white'

// 对于浅色图片，使用黑色背景（默认）
backgroundColor: 'black'

// 根据品牌色选择
backgroundColor: '#FF6B35'  // 品牌橙色
```

### 2. 质量设置

透明度处理建议使用稍高的质量设置：

```typescript
// 推荐设置
{
  samplingFactor: SamplingFactor.YUV422,  // 更好的色彩质量
  quality: 8,                             // 稍高质量
  backgroundColor: 'white'
}
```

### 3. 批量处理

```typescript
const transparentImages = ['logo.png', 'icon.webp', 'banner.gif'];

const results = await Promise.all(
  transparentImages.map(async (file, index) => {
    return convertToJpeg({
      inputPath: file,
      outputPath: `output_${index}.bin`,
      samplingFactor: SamplingFactor.YUV420,
      quality: 10,
      backgroundColor: index % 2 === 0 ? 'white' : 'black'  // 交替背景色
    });
  })
);
```

## 故障排除

### 常见问题

1. **FFmpeg 不支持 lavfi**
   ```
   错误: Unknown input format: 'lavfi'
   解决: 更新 FFmpeg 到支持 lavfi 的版本
   ```

2. **背景色不生效**
   ```
   检查: backgroundColor 参数拼写和格式
   确保: 使用支持的颜色格式
   ```

3. **转换时间过长**
   ```
   原因: 大尺寸图片的透明度处理较慢
   解决: 考虑先缩放图片或使用较低质量设置
   ```

### 调试命令

```bash
# 手动测试透明度处理
ffmpeg -i input.png -f lavfi -i "color=black" \
  -filter_complex "[1:v][0:v]scale2ref[bg][fg];[bg][fg]overlay=format=auto" \
  -c:v mjpeg -pix_fmt yuvj420p -q:v 10 -frames:v 1 test_output.jpg

# 检查 FFmpeg 支持的滤镜
ffmpeg -filters | grep -E "(color|overlay|scale2ref)"

# 检查输入文件信息
ffmpeg -i input.png -hide_banner
```

## 技术细节

### FFmpeg 滤镜链

透明度处理使用的完整滤镜链：

```
[1:v][0:v]scale2ref[bg][fg];[bg][fg]overlay=format=auto
```

**解释：**
1. `[1:v]` - 背景色输入（lavfi color）
2. `[0:v]` - 原始图片输入
3. `scale2ref` - 将背景缩放到与原图相同尺寸
4. `[bg][fg]` - 标记背景和前景
5. `overlay=format=auto` - 自动格式叠加

### 输出格式

透明度处理后的输出与普通转换相同：

- **文件扩展名**: `.bin`
- **头部结构**: 16 字节自定义头部 + JPEG 数据
- **JPEG 格式**: 标准 JPEG，从 0xFFD8 开始

## 更新历史

- **v1.1.0** - 添加透明度处理功能
- **v1.1.1** - 支持自定义背景色
- **v1.1.2** - 优化性能和错误处理

## 相关文档

- [API Reference](API.md) - 完整 API 文档
- [Integration Guide](INTEGRATION.md) - 集成指南
- [CLI Usage](../examples/cli-usage.md) - 命令行使用