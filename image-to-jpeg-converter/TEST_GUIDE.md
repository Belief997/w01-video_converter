# 测试指南

## 快速测试用例

这里提供了两个简单的测试用例，用于验证 image-to-jpeg-converter 库的集成和功能。

## 📁 测试文件

### 1. `quick-test.js` - 最简单的验证
**用途**: 快速验证库是否正常工作  
**特点**: 自动创建测试图片，最小化依赖

```bash
# 运行快速测试
node quick-test.js
```

**测试内容**:
- ✅ 创建 1x1 像素测试 PNG
- ✅ 执行基本 JPEG 转换
- ✅ 验证输出文件格式
- ✅ 检查自定义头部结构

### 2. `simple-test.js` - 完整功能测试
**用途**: 全面测试各种功能和选项  
**特点**: 测试多种采样因子、质量设置、错误处理

```bash
# 运行完整测试
node simple-test.js
```

**测试内容**:
- ✅ 基本转换功能
- ✅ 高级选项 (4:4:4, 灰度, 缩放, 压缩)
- ✅ 错误处理验证
- ✅ 输出文件完整性检查

## 🚀 使用步骤

### 前提条件
1. **安装 FFmpeg**:
   ```bash
   # Windows
   choco install ffmpeg
   
   # macOS
   brew install ffmpeg
   
   # Linux
   sudo apt install ffmpeg
   ```

2. **确保项目已构建**:
   ```bash
   cd image-to-jpeg-converter
   npm run build
   ```

### 运行测试

#### 方法1: 快速验证
```bash
# 最简单的测试，自动创建测试图片
node quick-test.js
```

**预期输出**:
```
🚀 快速测试开始...

📸 创建测试图片...
✅ 测试图片创建完成

🔄 执行图片转换...
✅ 转换成功!
📁 输出文件: output.jpg
📏 文件大小: 1234 字节
📐 图片尺寸: 1x1

🔍 验证输出文件...
✅ 输出文件大小正常: 1234 字节
✅ 自定义头部类型正确 (JPEG=12)
✅ 找到 JPEG 数据标记 (偏移: 16)

🎉 快速测试通过!
✅ 图片转 JPEG 转换器工作正常
📄 输出文件: output.jpg
```

#### 方法2: 完整测试
```bash
# 全面的功能测试
node simple-test.js
```

**预期输出**:
```
🧪 图片转 JPEG 转换器 - 简单测试

==================================================
📸 创建测试图片...
  ✅ 测试图片创建完成 (10x10 红色 PNG)

🔄 测试基本转换功能...
  ✅ 基本转换成功!
  📁 输出文件: test-output/basic.jpg
  📏 JPEG 大小: 2345 字节
  📐 图片尺寸: 10x10

🔧 测试高级选项...
  🧪 高质量 (4:4:4)...
    ✅ 成功 - 3456 字节
  🧪 灰度转换...
    ✅ 成功 - 1234 字节
  🧪 缩放到50%...
    ✅ 成功 - 1567 字节
  🧪 启用压缩标志...
    ✅ 成功 - 2234 字节
  📊 高级选项测试: 4/4 成功

🚨 测试错误处理...
  🧪 不存在的输入文件...
    ✅ 正确捕获 validation 错误
  🧪 无效的质量值...
    ✅ 正确捕获 validation 错误
  📊 错误处理测试: 2/2 正确

🔍 验证输出文件...
  ✅ test-output/basic.jpg 验证通过 (2345 字节)
  ✅ test-output/high-quality.jpg 验证通过 (3456 字节)
  ✅ test-output/grayscale.jpg 验证通过 (1234 字节)
  ✅ test-output/resized.jpg 验证通过 (1567 字节)
  ✅ test-output/compressed.jpg 验证通过 (2234 字节)
  📊 文件验证: 5/5 有效

==================================================
📊 测试结果总结:
  基本转换: ✅ 通过
  高级选项: ✅ 通过
  错误处理: ✅ 通过
  文件验证: ✅ 通过

🎉 所有测试通过! 库集成成功!
✅ 图片转 JPEG 转换器可以正常使用

📁 输出文件位置: test-output/
🔍 可以检查生成的 JPEG 文件
```

## 🔧 自定义测试

### 使用自己的图片测试
```javascript
import { convertToJpeg, SamplingFactor } from './dist/index.js';

async function testMyImage() {
  try {
    const result = await convertToJpeg({
      inputPath: 'my-image.png',        // 你的图片路径
      outputPath: 'my-output.jpg',      // 输出路径
      samplingFactor: SamplingFactor.YUV420,  // 采样因子
      quality: 10                       // 质量 (1-31)
    });
    
    console.log('转换成功:', result);
  } catch (error) {
    console.error('转换失败:', error.message);
  }
}

testMyImage();
```

### 测试不同的配置
```javascript
// 高质量设置
await convertToJpeg({
  inputPath: 'input.png',
  outputPath: 'high-quality.jpg',
  samplingFactor: SamplingFactor.YUV444,  // 最佳质量
  quality: 2                              // 最高质量
});

// 压缩设置
await convertToJpeg({
  inputPath: 'input.png',
  outputPath: 'compressed.jpg',
  samplingFactor: SamplingFactor.Grayscale,  // 灰度
  quality: 20,                               // 较低质量
  resize: ResizeOption.Fifty                 // 缩放到50%
});
```

## 🐛 故障排除

### 常见错误及解决方案

#### 1. FFmpeg 未找到
```
Error: FFmpeg not found in system PATH
```
**解决方案**: 安装 FFmpeg 并确保在 PATH 中
```bash
# 验证 FFmpeg 安装
ffmpeg -version
```

#### 2. 输入文件不存在
```
Error: Input file does not exist: /path/to/file.png
```
**解决方案**: 检查文件路径是否正确

#### 3. 质量参数超出范围
```
Error: Quality must be between 1 and 31, got: 50
```
**解决方案**: 使用 1-31 范围内的质量值

#### 4. 无效的采样因子
```
Error: Invalid sampling factor: 123
```
**解决方案**: 使用有效的采样因子 (400, 420, 422, 444)

### 调试模式
```bash
# 启用详细日志
DEBUG=image-to-jpeg-converter node quick-test.js
```

## 📊 输出文件验证

### 检查输出文件结构
生成的 JPEG 文件包含:
1. **自定义头部** (16 字节): 包含图片元数据
2. **JPEG 数据**: 标准 JPEG 格式，从 0xFFD8 开始

### 使用十六进制查看器验证
```bash
# Windows
certutil -encodehex output.jpg output.hex 1

# Linux/macOS
hexdump -C output.jpg | head -5
```

**预期输出格式**:
```
00000000  00 0c 01 00 01 00 00 00  05 07 00 00 00 00 00 00  |................|
00000010  ff d8 ff e0 00 10 4a 46  49 46 00 01 01 01 00 48  |......JFIF.....H|
          ^     ^                                              
          |     |                                              
          |     JPEG 数据开始 (0xFFD8)                         
          自定义头部 (type=12)                                  
```

## 🎯 集成到你的项目

### 复制源码
```bash
# 复制源文件到你的项目
cp -r image-to-jpeg-converter/src/* your-project/src/

# 复制类型定义 (可选)
cp -r image-to-jpeg-converter/dist/*.d.ts your-project/types/
```

### 在你的代码中使用
```typescript
import { convertToJpeg, SamplingFactor } from './your-path/index.js';

// 在你的应用中使用
const result = await convertToJpeg({
  inputPath: userUploadedImage,
  outputPath: processedImagePath,
  samplingFactor: SamplingFactor.YUV420,
  quality: 10
});
```

## 📚 更多信息

- **[完整 API 文档](docs/API.md)** - 详细的 API 参考
- **[集成指南](docs/INTEGRATION.md)** - 完整的集成说明
- **[使用示例](examples/)** - 更多实用示例

---

**测试愉快！** 🎉