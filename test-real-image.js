/**
 * 真实图片转换测试
 * 
 * 使用 test_image 目录下的真实图片进行转换测试
 * 验证图片转 JPEG 转换器的实际效果
 */

import { convertToJpeg, SamplingFactor, ResizeOption } from './image-to-jpeg-converter/dist/index.js';
import { readFile, mkdir, stat } from 'fs/promises';
import { join } from 'path';

async function testRealImageConversion() {
  console.log('🖼️  真实图片转 JPEG 测试\n');
  console.log('=' .repeat(60));
  
  const inputImage = 'test_image/ac_cold.png';
  
  try {
    // 检查输入图片
    console.log('📸 检查输入图片...');
    const inputStats = await stat(inputImage);
    console.log(`  ✅ 找到图片: ${inputImage}`);
    console.log(`  📏 原始大小: ${formatBytes(inputStats.size)}`);
    
    // 创建输出目录
    await mkdir('converted-images', { recursive: true });
    console.log('  ✅ 创建输出目录: converted-images/');
    
    // 测试配置列表
    const testConfigs = [
      {
        name: '标准转换 (4:2:0, 质量10)',
        config: {
          inputPath: inputImage,
          outputPath: 'converted-images/ac_cold_standard.bin',
          samplingFactor: SamplingFactor.YUV420,
          quality: 10
        }
      },
      {
        name: '高质量转换 (4:4:4, 质量2)',
        config: {
          inputPath: inputImage,
          outputPath: 'converted-images/ac_cold_high_quality.bin',
          samplingFactor: SamplingFactor.YUV444,
          quality: 2
        }
      },
      {
        name: '灰度转换 (400, 质量15)',
        config: {
          inputPath: inputImage,
          outputPath: 'converted-images/ac_cold_grayscale.bin',
          samplingFactor: SamplingFactor.Grayscale,
          quality: 15
        }
      },
      {
        name: '缩略图 (4:2:2, 质量8, 50%缩放)',
        config: {
          inputPath: inputImage,
          outputPath: 'converted-images/ac_cold_thumbnail.bin',
          samplingFactor: SamplingFactor.YUV422,
          quality: 8,
          resize: ResizeOption.Fifty
        }
      },
      {
        name: '压缩版本 (4:2:0, 质量20, 启用压缩)',
        config: {
          inputPath: inputImage,
          outputPath: 'converted-images/ac_cold_compressed.bin',
          samplingFactor: SamplingFactor.YUV420,
          quality: 20,
          compress: true
        }
      }
    ];
    
    console.log(`\n🔄 开始转换测试 (共 ${testConfigs.length} 个配置)...\n`);
    
    const results = [];
    
    // 逐个执行转换测试
    for (let i = 0; i < testConfigs.length; i++) {
      const test = testConfigs[i];
      console.log(`${i + 1}. ${test.name}`);
      
      try {
        const startTime = Date.now();
        const result = await convertToJpeg(test.config);
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // 获取输出文件信息
        const outputStats = await stat(result.outputPath);
        const compressionRatio = ((inputStats.size - outputStats.size) / inputStats.size * 100).toFixed(1);
        
        console.log(`   ✅ 转换成功 (${duration}ms)`);
        console.log(`   📁 输出: ${result.outputPath}`);
        console.log(`   📏 JPEG 大小: ${formatBytes(result.jpegSize)}`);
        console.log(`   📐 尺寸: ${result.dimensions.width}x${result.dimensions.height}`);
        console.log(`   📊 文件大小: ${formatBytes(outputStats.size)}`);
        console.log(`   🗜️  压缩率: ${compressionRatio}%`);
        
        results.push({
          name: test.name,
          success: true,
          result,
          outputSize: outputStats.size,
          compressionRatio: parseFloat(compressionRatio),
          duration
        });
        
      } catch (error) {
        console.log(`   ❌ 转换失败: ${error.message}`);
        console.log(`   🔍 错误类型: ${error.type || 'unknown'}`);
        
        results.push({
          name: test.name,
          success: false,
          error: error.message,
          errorType: error.type
        });
      }
      
      console.log(''); // 空行分隔
    }
    
    // 验证输出文件
    console.log('🔍 验证输出文件...\n');
    
    for (const result of results) {
      if (!result.success) continue;
      
      const filePath = result.result.outputPath;
      
      try {
        const buffer = await readFile(filePath);
        
        console.log(`📄 ${filePath}:`);
        
        // 检查文件大小
        if (buffer.length < 16) {
          console.log(`   ❌ 文件太小 (${buffer.length} 字节)`);
          continue;
        }
        
        // 检查自定义头部结构
        console.log(`   📏 总大小: ${formatBytes(buffer.length)}`);
        
        // 检查 RGB Data Header (前8字节)
        const headerType = buffer[1];
        const width = buffer.readUInt16LE(2);
        const height = buffer.readUInt16LE(4);
        
        if (headerType === 0x0C) {
          console.log(`   ✅ 头部类型正确: ${headerType} (JPEG)`);
        } else {
          console.log(`   ⚠️  头部类型异常: ${headerType}`);
        }
        
        console.log(`   📐 头部记录尺寸: ${width}x${height}`);
        
        // 检查 JPEG 文件大小字段 (字节8-11)
        const jpegSize = buffer.readUInt32LE(8);
        console.log(`   📊 头部记录 JPEG 大小: ${formatBytes(jpegSize)}`);
        
        // 查找 JPEG 数据标记
        let jpegOffset = -1;
        for (let i = 0; i < buffer.length - 1; i++) {
          if (buffer[i] === 0xFF && buffer[i + 1] === 0xD8) {
            jpegOffset = i;
            break;
          }
        }
        
        if (jpegOffset >= 0) {
          console.log(`   ✅ JPEG 数据标记位置: 偏移 ${jpegOffset}`);
          const actualJpegSize = buffer.length - jpegOffset;
          console.log(`   📊 实际 JPEG 数据大小: ${formatBytes(actualJpegSize)}`);
          
          // 验证大小一致性
          if (Math.abs(jpegSize - actualJpegSize) <= 1) {
            console.log(`   ✅ JPEG 大小字段准确`);
          } else {
            console.log(`   ⚠️  JPEG 大小字段不匹配 (头部:${jpegSize}, 实际:${actualJpegSize})`);
          }
        } else {
          console.log(`   ❌ 未找到 JPEG 数据标记`);
        }
        
        // 显示头部十六进制
        const headerHex = buffer.subarray(0, 16).toString('hex').match(/.{2}/g).join(' ');
        console.log(`   🔍 头部十六进制: ${headerHex}`);
        
      } catch (error) {
        console.log(`   ❌ 文件验证失败: ${error.message}`);
      }
      
      console.log(''); // 空行分隔
    }
    
    // 生成测试报告
    console.log('=' .repeat(60));
    console.log('📊 测试报告\n');
    
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;
    
    console.log(`📈 转换结果:`);
    console.log(`   ✅ 成功: ${successCount}/${results.length}`);
    console.log(`   ❌ 失败: ${failureCount}/${results.length}`);
    
    if (successCount > 0) {
      console.log(`\n📊 成功转换统计:`);
      
      const successResults = results.filter(r => r.success);
      const avgCompression = (successResults.reduce((sum, r) => sum + r.compressionRatio, 0) / successResults.length).toFixed(1);
      const avgDuration = Math.round(successResults.reduce((sum, r) => sum + r.duration, 0) / successResults.length);
      const totalOutputSize = successResults.reduce((sum, r) => sum + r.outputSize, 0);
      
      console.log(`   🗜️  平均压缩率: ${avgCompression}%`);
      console.log(`   ⏱️  平均转换时间: ${avgDuration}ms`);
      console.log(`   📏 总输出大小: ${formatBytes(totalOutputSize)}`);
      
      console.log(`\n📁 输出文件列表:`);
      successResults.forEach(r => {
        console.log(`   - ${r.result.outputPath} (${formatBytes(r.outputSize)})`);
      });
    }
    
    if (failureCount > 0) {
      console.log(`\n❌ 失败原因:`);
      results.filter(r => !r.success).forEach(r => {
        console.log(`   - ${r.name}: ${r.error} (${r.errorType || 'unknown'})`);
      });
    }
    
    console.log(`\n💡 提示:`);
    console.log(`   - 输出文件保存在: converted-images/`);
    console.log(`   - 文件使用 .bin 扩展名，包含自定义二进制头部`);
    console.log(`   - 可以用十六进制编辑器查看文件头部结构`);
    console.log(`   - JPEG 数据从偏移位置开始，可用图片查看器打开验证`);
    
    if (successCount === results.length) {
      console.log(`\n🎉 所有测试通过！图片转 JPEG 转换器工作完美！`);
    } else if (successCount > 0) {
      console.log(`\n⚠️  部分测试通过，请检查失败的配置`);
    } else {
      console.log(`\n❌ 所有测试失败，请检查 FFmpeg 安装和配置`);
    }
    
  } catch (error) {
    console.error('\n💥 测试执行失败:', error.message);
    
    if (error.code === 'ENOENT' && error.path && error.path.includes('test_image')) {
      console.log('\n💡 解决方案:');
      console.log('   1. 确保 test_image/ac_cold.png 文件存在');
      console.log('   2. 检查文件路径是否正确');
      console.log('   3. 确保有读取文件的权限');
    } else if (error.type === 'ffmpeg') {
      console.log('\n💡 FFmpeg 问题解决方案:');
      console.log('   1. 安装 FFmpeg: https://ffmpeg.org/download.html');
      console.log('   2. 确保 FFmpeg 在系统 PATH 中');
      console.log('   3. 运行 "ffmpeg -version" 验证安装');
    }
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// 运行真实图片测试
testRealImageConversion();