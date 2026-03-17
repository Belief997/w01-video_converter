# 简单测试用例总结

## 🎯 图片转 JPEG 转换器 - 源码集成测试

我已经为你创建了几个简单的测试用例，用于验证 image-to-jpeg-converter 库的集成和功能。

## 📁 测试文件列表

### 1. `test-converter.js` - 完整功能测试
**位置**: 项目根目录  
**用途**: 全面测试所有功能  
**特点**: 自动创建测试图片，测试多种配置

```bash
node test-converter.js
```

**测试内容**:
- ✅ 基本转换 (4:2:0, 质量10)
- ✅ 高质量转换 (4:4:4, 质量2)
- ✅ 灰度转换 (400, 质量15)
- ✅ 高级选项 (缩放50%, 启用压缩)
- ✅ 错误处理验证
- ✅ 输出文件格式验证

### 2. `demo-usage.js` - 使用指南演示
**位置**: 项目根目录  
**用途**: 展示如何使用库的各种功能  
**特点**: 不需要实际文件，展示代码示例

```bash
node demo-usage.js
```

**演示内容**:
- 📖 基本使用方法
- 📖 高级配置选项
- 📖 错误处理模式
- 📖 批量处理示例
- 📖 Web 应用集成 (Express.js)
- 📖 配置参数说明
- 📖 输出文件格式说明

### 3. `image-to-jpeg-converter/quick-test.js` - 快速验证
**位置**: image-to-jpeg-converter 目录内  
**用途**: 最简单的功能验证  
**特点**: 自动创建最小测试图片

```bash
cd image-to-jpeg-converter
node quick-test.js
```

### 4. `image-to-jpeg-converter/simple-test.js` - 详细测试
**位置**: image-to-jpeg-converter 目录内  
**用途**: 详细的功能和选项测试  
**特点**: 全面的测试覆盖

```bash
cd image-to-jpeg-converter
node simple-test.js
```

## 🚀 快速开始测试

### 最简单的测试方法

1. **运行演示程序** (不需要 FFmpeg):
   ```bash
   node demo-usage.js
   ```
   这会展示所有使用方法和配置选项。

2. **运行功能测试** (需要 FFmpeg):
   ```bash
   node test-converter.js
   ```
   这会创建测试图片并执行实际转换。

### 如果你有 FFmpeg

如果你已经安装了 FFmpeg，可以运行完整测试：

```bash
# 检查 FFmpeg 是否可用
ffmpeg -version

# 运行完整测试
node test-converter.js
```

**预期输出**:
```
🧪 图片转 JPEG 转换器测试

📸 创建测试图片...
  ✅ 3x3 红色 PNG 图片创建完成

🔄 测试基本转换 (4:2:0, 质量10)...
  ✅ 基本转换成功
  📁 输出: test-outputs/basic.jpg
  📏 大小: 1234 字节
  📐 尺寸: 3x3

🔄 测试高质量转换 (4:4:4, 质量2)...
  ✅ 高质量转换成功
  📏 大小: 2345 字节

🎉 所有测试完成!
✅ 图片转 JPEG 转换器工作正常
```

### 如果没有 FFmpeg

如果没有安装 FFmpeg，你仍然可以：

1. **查看使用演示**:
   ```bash
   node demo-usage.js
   ```

2. **查看 API 文档**:
   - `image-to-jpeg-converter/docs/API.md`
   - `image-to-jpeg-converter/docs/INTEGRATION.md`
   - `image-to-jpeg-converter/TEST_GUIDE.md`

## 📖 源码集成示例

### 基本使用

```javascript
import { convertToJpeg, SamplingFactor } from './image-to-jpeg-converter/dist/index.js';

// 基本转换
const result = await convertToJpeg({
  inputPath: 'input.png',
  outputPath: 'output.jpg',
  samplingFactor: SamplingFactor.YUV420,
  quality: 10
});

console.log(`转换成功: ${result.outputPath}`);
console.log(`文件大小: ${result.jpegSize} 字节`);
console.log(`图片尺寸: ${result.dimensions.width}x${result.dimensions.height}`);
```

### 高级选项

```javascript
import { convertToJpeg, SamplingFactor, ResizeOption } from './image-to-jpeg-converter/dist/index.js';

// 高级转换
const result = await convertToJpeg({
  inputPath: 'large-image.png',
  outputPath: 'thumbnail.jpg',
  samplingFactor: SamplingFactor.YUV422,  // 4:2:2 采样
  quality: 8,                             // 高质量
  resize: ResizeOption.Fifty,             // 缩放到 50%
  compress: true                          // 启用压缩标志
});
```

### 错误处理

```javascript
try {
  const result = await convertToJpeg(config);
  console.log('✅ 转换成功:', result);
} catch (error) {
  if (error.type === 'validation') {
    console.error('❌ 验证错误:', error.message);
  } else if (error.type === 'ffmpeg') {
    console.error('❌ FFmpeg 错误:', error.message);
    console.log('💡 确保 FFmpeg 已安装并在 PATH 中');
  }
}
```

## 🔧 集成到你的项目

### 1. 复制源码

```bash
# 复制源文件到你的项目
cp -r image-to-jpeg-converter/src/* your-project/src/

# 或者复制编译后的文件
cp -r image-to-jpeg-converter/dist/* your-project/lib/
```

### 2. 安装依赖

确保你的项目有以下依赖：
- Node.js 18.0.0+
- FFmpeg (系统级安装)

### 3. 在代码中使用

```javascript
// 导入库
import { convertToJpeg, SamplingFactor } from './your-path/index.js';

// 使用转换功能
const result = await convertToJpeg({
  inputPath: userImagePath,
  outputPath: processedImagePath,
  samplingFactor: SamplingFactor.YUV420,
  quality: 10
});
```

## 📊 输出文件格式

生成的 JPEG 文件包含：

1. **自定义头部** (16 字节):
   - RGB Data Header (8 字节): 图片元数据
   - JPEG 大小字段 (4 字节): JPEG 数据大小
   - 对齐字段 (4 字节): 总是 0

2. **JPEG 数据**: 标准 JPEG 格式，从 0xFFD8 开始

### 十六进制示例
```
00 0c 48 00 48 00 00 00 05 07 00 00 00 00 00 00 ff d8 ff e0 ...
|  |  |     |     |  |  |        |        |        |
|  |  |     |     |  |  |        |        |        JPEG 数据
|  |  |     |     |  |  |        |        对齐 (0)
|  |  |     |     |  |  |        JPEG 大小
|  |  |     |     |  |  版本, 保留
|  |  |     |     高度
|  |  |     宽度  
|  |  类型 (12=JPEG)
|  位字段
```

## 🎉 总结

这些测试用例提供了：

- ✅ **完整的功能验证** - 测试所有转换选项
- ✅ **源码集成示例** - 展示如何在项目中使用
- ✅ **错误处理演示** - 展示如何处理各种错误
- ✅ **配置选项说明** - 详细的参数说明
- ✅ **输出格式验证** - 确保生成正确的二进制格式

你可以根据需要选择合适的测试用例来验证库的功能和集成效果。

---

**开始测试吧！** 🚀