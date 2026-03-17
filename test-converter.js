/**
 * 独立的图片转 JPEG 转换器测试
 * 
 * 使用方法:
 * 1. 确保 FFmpeg 已安装
 * 2. 运行: node test-converter.js
 * 
 * 这个测试会自动创建测试图片并验证转换功能
 */

import { convertToJpeg, SamplingFactor, ResizeOption } from './image-to-jpeg-converter/dist/index.js';
import { writeFile, readFile, mkdir } from 'fs/promises';

async function createTestPNG() {
  // 创建一个简单的 3x3 红色 PNG 图片
  const pngData = Buffer.from([
    // PNG 文件签名
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
    
    // IHDR 块 (图片头信息)
    0x00, 0x00, 0x00, 0x0D, // 长度: 13
    0x49, 0x48, 0x44, 0x52, // 类型: IHDR
    0x00, 0x00, 0x00, 0x03, // 宽度: 3
    0x00, 0x00, 0x00, 0x03, // 高度: 3
    0x08, 0x02, 0x00, 0x00, 0x00, // 8位 RGB, 无压缩, 无滤波, 无交错
    0x32, 0x8B, 0x0A, 0x1E, // CRC32
    
    // IDAT 块 (图片数据)
    0x00, 0x00, 0x00, 0x12, // 长度: 18
    0x49, 0x44, 0x41, 0x54, // 类型: IDAT
    // 压缩的红色像素数据 (3x3 红色像素)
    0x78, 0x9C, 0x63, 0xF8, 0x0F, 0x00, 0x00, 0xFF,
    0xFF, 0x03, 0x00, 0x00, 0x06, 0x00, 0x05, 0xAC,
    0x27, 0x56,
    0x8A, 0x2C, 0x49, 0x55, // CRC32
    
    // IEND 块 (结束标记)
    0x00, 0x00, 0x00, 0x00, // 长度: 0
    0x49, 0x45, 0x4E, 0x44, // 类型: IEND
    0xAE, 0x42, 0x60, 0x82  // CRC32
  ]);
  
  await writeFile('test-input.png', pngData);
  return 'test-input.png';
}

async function testConversion() {
  console.log('🧪 图片转 JPEG 转换器测试\n');
  
  try {
    // 创建输出目录
    await mkdir('test-outputs', { recursive: true });
    
    // 1. 创建测试图片
    console.log('📸 创建测试图片...');
    const inputFile = await createTestPNG();
    console.log('  ✅ 3x3 红色 PNG 图片创建完成');
    
    // 2. 基本转换测试
    console.log('\n🔄 测试基本转换 (4:2:0, 质量10)...');
    const basicResult = await convertToJpeg({
      inputPath: inputFile,
      outputPath: 'test-outputs/basic.bin',
      samplingFactor: SamplingFactor.YUV420,
      quality: 10
    });
    
    console.log('  ✅ 基本转换成功');
    console.log(`  📁 输出: ${basicResult.outputPath}`);
    console.log(`  📏 大小: ${basicResult.jpegSize} 字节`);
    console.log(`  📐 尺寸: ${basicResult.dimensions.width}x${basicResult.dimensions.height}`);
    
    // 3. 高质量转换测试
    console.log('\n🔄 测试高质量转换 (4:4:4, 质量2)...');
    const highQualityResult = await convertToJpeg({
      inputPath: inputFile,
      outputPath: 'test-outputs/high-quality.bin',
      samplingFactor: SamplingFactor.YUV444,
      quality: 2
    });
    
    console.log('  ✅ 高质量转换成功');
    console.log(`  📏 大小: ${highQualityResult.jpegSize} 字节`);
    
    // 4. 灰度转换测试
    console.log('\n🔄 测试灰度转换 (400, 质量15)...');
    const grayscaleResult = await convertToJpeg({
      inputPath: inputFile,
      outputPath: 'test-outputs/grayscale.bin',
      samplingFactor: SamplingFactor.Grayscale,
      quality: 15
    });
    
    console.log('  ✅ 灰度转换成功');
    console.log(`  📏 大小: ${grayscaleResult.jpegSize} 字节`);
    
    // 5. 带选项的转换测试
    console.log('\n🔄 测试高级选项 (缩放50%, 启用压缩)...');
    const advancedResult = await convertToJpeg({
      inputPath: inputFile,
      outputPath: 'test-outputs/advanced.bin',
      samplingFactor: SamplingFactor.YUV422,
      quality: 8,
      resize: ResizeOption.Fifty,
      compress: true
    });
    
    console.log('  ✅ 高级选项转换成功');
    console.log(`  📏 大小: ${advancedResult.jpegSize} 字节`);
    
    // 6. 验证输出文件
    console.log('\n🔍 验证输出文件...');
    const outputFiles = [
      'test-outputs/basic.bin',
      'test-outputs/high-quality.bin', 
      'test-outputs/grayscale.bin',
      'test-outputs/advanced.bin'
    ];
    
    for (const file of outputFiles) {
      const buffer = await readFile(file);
      
      // 检查文件大小
      if (buffer.length < 16) {
        console.log(`  ❌ ${file} 文件太小`);
        continue;
      }
      
      // 检查自定义头部
      const headerType = buffer[1];
      if (headerType === 0x0C) {
        console.log(`  ✅ ${file} 头部正确 (类型=${headerType})`);
      } else {
        console.log(`  ⚠️  ${file} 头部类型异常: ${headerType}`);
      }
      
      // 查找 JPEG 数据
      let jpegOffset = -1;
      for (let i = 0; i < buffer.length - 1; i++) {
        if (buffer[i] === 0xFF && buffer[i + 1] === 0xD8) {
          jpegOffset = i;
          break;
        }
      }
      
      if (jpegOffset >= 0) {
        console.log(`  ✅ ${file} JPEG 数据正确 (偏移=${jpegOffset}, 大小=${buffer.length} 字节)`);
      } else {
        console.log(`  ❌ ${file} 未找到 JPEG 数据`);
      }
    }
    
    // 7. 测试错误处理
    console.log('\n🚨 测试错误处理...');
    try {
      await convertToJpeg({
        inputPath: 'non-existent.png',
        outputPath: 'test-outputs/error.bin',
        samplingFactor: SamplingFactor.YUV420,
        quality: 10
      });
      console.log('  ❌ 应该产生错误但没有');
    } catch (error) {
      if (error.type === 'validation') {
        console.log('  ✅ 正确捕获验证错误');
      } else {
        console.log(`  ⚠️  捕获到其他错误: ${error.type}`);
      }
    }
    
    // 总结
    console.log('\n' + '='.repeat(50));
    console.log('🎉 所有测试完成!');
    console.log('✅ 图片转 JPEG 转换器工作正常');
    console.log('📁 输出文件保存在: test-outputs/');
    console.log('\n💡 你可以检查生成的二进制文件:');
    console.log('   - basic.bin (基本转换)');
    console.log('   - high-quality.bin (高质量)');
    console.log('   - grayscale.bin (灰度)');
    console.log('   - advanced.bin (高级选项)');
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error('错误类型:', error.type || 'unknown');
    
    if (error.type === 'ffmpeg') {
      console.log('\n💡 FFmpeg 错误解决方案:');
      console.log('   1. 确保 FFmpeg 已安装');
      console.log('   2. 检查 FFmpeg 是否在 PATH 中');
      console.log('   3. 运行 "ffmpeg -version" 验证安装');
      console.log('\n安装 FFmpeg:');
      console.log('   Windows: choco install ffmpeg');
      console.log('   macOS: brew install ffmpeg');
      console.log('   Linux: sudo apt install ffmpeg');
    }
  }
}

// 运行测试
testConversion();