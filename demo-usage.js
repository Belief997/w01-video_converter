/**
 * 图片转 JPEG 转换器 - 使用演示
 * 
 * 这个文件展示如何在你的项目中集成和使用 image-to-jpeg-converter 库
 * 
 * 注意: 实际运行需要安装 FFmpeg
 */

// 1. 导入库 (假设已经复制源码到你的项目)
import { convertToJpeg, SamplingFactor, ResizeOption } from './image-to-jpeg-converter/dist/index.js';

/**
 * 基本使用示例
 */
async function basicUsage() {
  console.log('📖 基本使用示例\n');
  
  try {
    const result = await convertToJpeg({
      inputPath: 'input.png',           // 输入图片路径
      outputPath: 'output.bin',         // 输出二进制文件路径
      samplingFactor: SamplingFactor.YUV420,  // 4:2:0 采样 (常用)
      quality: 10                       // 质量 1-31 (越小质量越高)
    });
    
    console.log('✅ 转换成功!');
    console.log(`📁 输出文件: ${result.outputPath}`);
    console.log(`📏 JPEG 大小: ${result.jpegSize} 字节`);
    console.log(`📐 图片尺寸: ${result.dimensions.width}x${result.dimensions.height}`);
    
  } catch (error) {
    console.error('❌ 转换失败:', error.message);
  }
}

/**
 * 高级选项示例
 */
async function advancedUsage() {
  console.log('📖 高级选项示例\n');
  
  // 高质量转换
  const highQualityConfig = {
    inputPath: 'photo.png',
    outputPath: 'photo-hq.bin',
    samplingFactor: SamplingFactor.YUV444,  // 4:4:4 最佳质量
    quality: 2                              // 最高质量
  };
  
  // 灰度转换
  const grayscaleConfig = {
    inputPath: 'photo.png',
    outputPath: 'photo-gray.bin',
    samplingFactor: SamplingFactor.Grayscale,  // 灰度
    quality: 15
  };
  
  // 缩放转换
  const resizedConfig = {
    inputPath: 'large-image.png',
    outputPath: 'thumbnail.bin',
    samplingFactor: SamplingFactor.YUV420,
    quality: 10,
    resize: ResizeOption.Fifty,             // 缩放到 50%
    compress: true                          // 启用压缩标志
  };
  
  console.log('配置示例:');
  console.log('高质量:', JSON.stringify(highQualityConfig, null, 2));
  console.log('灰度:', JSON.stringify(grayscaleConfig, null, 2));
  console.log('缩放:', JSON.stringify(resizedConfig, null, 2));
}

/**
 * 错误处理示例
 */
async function errorHandlingExample() {
  console.log('📖 错误处理示例\n');
  
  try {
    await convertToJpeg({
      inputPath: 'input.png',
      outputPath: 'output.bin',
      samplingFactor: SamplingFactor.YUV420,
      quality: 10
    });
  } catch (error) {
    if (error instanceof Error && 'type' in error) {
      const convError = error;
      switch (convError.type) {
        case 'validation':
          console.log('❌ 验证错误:', convError.message);
          console.log('💡 检查输入文件路径和参数');
          break;
          
        case 'ffmpeg':
          console.log('❌ FFmpeg 错误:', convError.message);
          console.log('💡 确保 FFmpeg 已安装并在 PATH 中');
          break;
          
        case 'io':
          console.log('❌ 文件 I/O 错误:', convError.message);
          console.log('💡 检查文件权限和磁盘空间');
          break;
          
        case 'header':
          console.log('❌ 头部生成错误:', convError.message);
          console.log('💡 JPEG 数据可能损坏');
          break;
      }
    } else {
      console.log('❌ 未知错误:', error.message);
    }
  }
}

/**
 * 批量处理示例
 */
async function batchProcessingExample() {
  console.log('📖 批量处理示例\n');
  
  const imageFiles = [
    'image1.png',
    'image2.bmp', 
    'image3.tiff'
  ];
  
  const conversions = imageFiles.map(file => ({
    inputPath: file,
    outputPath: file.replace(/\.[^.]+$/, '.bin'),
    samplingFactor: SamplingFactor.YUV420,
    quality: 10
  }));
  
  console.log('批量转换配置:');
  conversions.forEach((config, i) => {
    console.log(`${i + 1}. ${config.inputPath} → ${config.outputPath}`);
  });
  
  // 并行处理
  const results = await Promise.allSettled(
    conversions.map(config => convertToJpeg(config))
  );
  
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      console.log(`✅ ${imageFiles[i]} 转换成功`);
    } else {
      console.log(`❌ ${imageFiles[i]} 转换失败: ${result.reason.message}`);
    }
  });
}

/**
 * Web 应用集成示例 (Express.js)
 */
function webIntegrationExample() {
  console.log('📖 Web 应用集成示例\n');
  
  const expressCode = `
// Express.js 路由示例
import express from 'express';
import multer from 'multer';
import { convertToJpeg, SamplingFactor } from './image-converter/index.js';

const app = express();
const upload = multer({ dest: 'uploads/' });

app.post('/convert-image', upload.single('image'), async (req, res) => {
  try {
    const result = await convertToJpeg({
      inputPath: req.file.path,
      outputPath: \`converted/\${req.file.filename}.bin\`,
      samplingFactor: SamplingFactor.YUV420,
      quality: parseInt(req.body.quality) || 10
    });
    
    res.json({
      success: true,
      outputPath: result.outputPath,
      size: result.jpegSize,
      dimensions: result.dimensions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      type: error.type
    });
  }
});
`;
  
  console.log(expressCode);
}

/**
 * 配置选项说明
 */
function configurationGuide() {
  console.log('📖 配置选项说明\n');
  
  console.log('🎯 采样因子 (SamplingFactor):');
  console.log('  400 (Grayscale) - 灰度图片，最小文件');
  console.log('  420 (YUV420)    - 4:2:0 采样，常用平衡');
  console.log('  422 (YUV422)    - 4:2:2 采样，较好质量');
  console.log('  444 (YUV444)    - 4:4:4 采样，最佳质量');
  
  console.log('\n🎚️  质量设置 (quality: 1-31):');
  console.log('  1-5   - 极高质量 (大文件)');
  console.log('  6-10  - 高质量 (推荐)');
  console.log('  11-20 - 中等质量');
  console.log('  21-31 - 低质量 (小文件)');
  
  console.log('\n📏 缩放选项 (ResizeOption):');
  console.log('  None    (0) - 不缩放');
  console.log('  Fifty   (1) - 缩放到 50%');
  console.log('  Seventy (2) - 缩放到 70%');
  console.log('  Eighty  (3) - 缩放到 80%');
  
  console.log('\n🗜️  其他选项:');
  console.log('  compress - 启用压缩标志 (boolean)');
  console.log('  version  - 版本字段 (number, 默认 0)');
}

/**
 * 输出文件格式说明
 */
function outputFormatGuide() {
  console.log('📖 输出文件格式说明\n');
  
  console.log('📄 生成的二进制文件结构:');
  console.log('┌─────────────────────────────────────┐');
  console.log('│ 自定义头部 (16 字节)                │');
  console.log('├─────────────────────────────────────┤');
  console.log('│ RGB Data Header (8 字节)            │');
  console.log('│ - 位字段 (scan, align, resize 等)   │');
  console.log('│ - 类型 (12 = JPEG)                 │');
  console.log('│ - 宽度和高度                        │');
  console.log('│ - 版本和保留字段                    │');
  console.log('├─────────────────────────────────────┤');
  console.log('│ JPEG 文件大小 (4 字节)              │');
  console.log('├─────────────────────────────────────┤');
  console.log('│ 对齐字段 (4 字节, 总是 0)           │');
  console.log('├─────────────────────────────────────┤');
  console.log('│ JPEG 数据 (从 0xFFD8 开始)          │');
  console.log('│ - 标准 JPEG 格式                    │');
  console.log('│ - 可被标准 JPEG 解码器读取          │');
  console.log('└─────────────────────────────────────┘');
  
  console.log('\n🔍 十六进制示例 (72x72 图片):');
  console.log('00 0c 48 00 48 00 00 00 05 07 00 00 00 00 00 00 ff d8 ff e0 ...');
  console.log('|  |  |     |     |  |  |        |        |        |');
  console.log('|  |  |     |     |  |  |        |        |        JPEG 数据开始');
  console.log('|  |  |     |     |  |  |        |        对齐字段 (0)');
  console.log('|  |  |     |     |  |  |        JPEG 大小 (1797 字节)');
  console.log('|  |  |     |     |  |  版本 (0), 保留 (0)');
  console.log('|  |  |     |     高度 (72)');
  console.log('|  |  |     宽度 (72)');
  console.log('|  |  类型 (12 = JPEG)');
  console.log('|  位字段 (全部为 0)');
}

/**
 * 运行所有示例
 */
async function runAllExamples() {
  console.log('🎯 图片转 JPEG 转换器 - 使用指南\n');
  console.log('=' .repeat(60));
  
  await basicUsage();
  console.log('\n' + '-'.repeat(60));
  
  await advancedUsage();
  console.log('\n' + '-'.repeat(60));
  
  await errorHandlingExample();
  console.log('\n' + '-'.repeat(60));
  
  await batchProcessingExample();
  console.log('\n' + '-'.repeat(60));
  
  webIntegrationExample();
  console.log('\n' + '-'.repeat(60));
  
  configurationGuide();
  console.log('\n' + '-'.repeat(60));
  
  outputFormatGuide();
  
  console.log('\n' + '='.repeat(60));
  console.log('📚 更多信息:');
  console.log('  - API 文档: image-to-jpeg-converter/docs/API.md');
  console.log('  - 集成指南: image-to-jpeg-converter/docs/INTEGRATION.md');
  console.log('  - 使用示例: image-to-jpeg-converter/examples/');
  console.log('  - 测试指南: image-to-jpeg-converter/TEST_GUIDE.md');
  
  console.log('\n🚀 开始使用:');
  console.log('  1. 安装 FFmpeg');
  console.log('  2. 复制源码到你的项目');
  console.log('  3. 导入并使用 convertToJpeg 函数');
  
  console.log('\n💡 注意: 本演示需要 FFmpeg 才能实际运行转换');
}

// 运行演示
runAllExamples().catch(console.error);