/**
 * 快速测试用例 - 最简单的集成验证
 * 
 * 使用方法:
 * 1. 准备一个测试图片 test.png
 * 2. 运行: node quick-test.js
 */

import { convertToJpeg, SamplingFactor } from './dist/index.js';
import { writeFile, readFile } from 'fs/promises';

async function quickTest() {
  console.log('🚀 快速测试开始...\n');
  
  try {
    // 创建一个最小的测试 PNG (1x1 像素)
    console.log('📸 创建测试图片...');
    const minimalPng = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG 签名
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR 块
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 尺寸
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, // 8位 RGBA
      0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, // IDAT 块
      0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
      0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, // IEND 块
      0x42, 0x60, 0x82
    ]);
    
    await writeFile('test.png', minimalPng);
    console.log('✅ 测试图片创建完成');
    
    // 执行转换
    console.log('\n🔄 执行图片转换...');
    const result = await convertToJpeg({
      inputPath: 'test.png',
      outputPath: 'output.jpg',
      samplingFactor: SamplingFactor.YUV420,
      quality: 10
    });
    
    console.log('✅ 转换成功!');
    console.log(`📁 输出文件: ${result.outputPath}`);
    console.log(`📏 文件大小: ${result.jpegSize} 字节`);
    console.log(`📐 图片尺寸: ${result.dimensions.width}x${result.dimensions.height}`);
    
    // 验证输出文件
    console.log('\n🔍 验证输出文件...');
    const outputBuffer = await readFile('output.jpg');
    
    if (outputBuffer.length > 16) {
      console.log(`✅ 输出文件大小正常: ${outputBuffer.length} 字节`);
      
      // 检查自定义头部
      if (outputBuffer[1] === 0x0C) {
        console.log('✅ 自定义头部类型正确 (JPEG=12)');
      }
      
      // 查找 JPEG 标记
      for (let i = 0; i < outputBuffer.length - 1; i++) {
        if (outputBuffer[i] === 0xFF && outputBuffer[i + 1] === 0xD8) {
          console.log(`✅ 找到 JPEG 数据标记 (偏移: ${i})`);
          break;
        }
      }
      
      console.log('\n🎉 快速测试通过!');
      console.log('✅ 图片转 JPEG 转换器工作正常');
      console.log('📄 输出文件: output.jpg');
      
    } else {
      console.log('❌ 输出文件太小');
    }
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error('错误类型:', error.type || 'unknown');
    
    if (error.type === 'validation') {
      console.log('💡 提示: 检查输入文件路径和参数');
    } else if (error.type === 'ffmpeg') {
      console.log('💡 提示: 确保 FFmpeg 已安装并在 PATH 中');
      console.log('   Windows: choco install ffmpeg');
      console.log('   macOS: brew install ffmpeg');
      console.log('   Linux: sudo apt install ffmpeg');
    }
  }
}

// 运行快速测试
quickTest();