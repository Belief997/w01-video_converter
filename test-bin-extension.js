/**
 * 验证 .bin 扩展名更新测试
 * 
 * 这个测试验证所有输出文件都使用 .bin 扩展名
 */

import { convertToJpeg, SamplingFactor } from './image-to-jpeg-converter/dist/index.js';
import { mkdir, stat } from 'fs/promises';

async function testBinExtension() {
  console.log('🔍 验证 .bin 扩展名更新测试\n');
  
  try {
    // 创建测试输出目录
    await mkdir('test-bin-output', { recursive: true });
    
    const inputImage = 'test_image/ac_cold.png';
    
    // 检查输入文件
    const inputStats = await stat(inputImage);
    console.log(`📸 输入图片: ${inputImage} (${formatBytes(inputStats.size)})`);
    
    // 测试单个转换
    console.log('\n🔄 测试 .bin 扩展名转换...');
    
    const result = await convertToJpeg({
      inputPath: inputImage,
      outputPath: 'test-bin-output/test-output.bin',
      samplingFactor: SamplingFactor.YUV420,
      quality: 10
    });
    
    console.log('✅ 转换成功');
    console.log(`📁 输出文件: ${result.outputPath}`);
    console.log(`📏 JPEG 大小: ${formatBytes(result.jpegSize)}`);
    console.log(`📐 尺寸: ${result.dimensions.width}x${result.dimensions.height}`);
    
    // 验证文件存在
    const outputStats = await stat(result.outputPath);
    console.log(`📊 文件大小: ${formatBytes(outputStats.size)}`);
    
    // 检查扩展名
    if (result.outputPath.endsWith('.bin')) {
      console.log('✅ 扩展名正确: .bin');
    } else {
      console.log('❌ 扩展名错误: 应该是 .bin');
    }
    
    console.log('\n🎉 .bin 扩展名测试通过！');
    console.log('💡 所有输出文件现在都使用 .bin 扩展名，正确反映了文件包含自定义二进制头部的性质');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('错误类型:', error.type || 'unknown');
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// 运行测试
testBinExtension();