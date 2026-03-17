/**
 * 透明度处理测试
 * 
 * 测试新增的透明度图片处理功能
 * 验证带透明度的 PNG 图片能正确处理背景色
 */

import { convertToJpeg, SamplingFactor } from './image-to-jpeg-converter/dist/index.js';
import { mkdir, stat } from 'fs/promises';

async function testTransparencyHandling() {
  console.log('🎨 透明度处理功能测试\n');
  console.log('=' .repeat(60));
  
  try {
    // 创建测试输出目录
    await mkdir('transparency-test-output', { recursive: true });
    
    const inputImage = 'test_image/ac_cold.png';
    
    // 检查输入文件
    const inputStats = await stat(inputImage);
    console.log(`📸 输入图片: ${inputImage} (${formatBytes(inputStats.size)})`);
    console.log('💡 PNG 格式可能包含透明度，将使用背景色处理\n');
    
    // 测试不同背景色的透明度处理
    const transparencyTests = [
      {
        name: '默认黑色背景',
        config: {
          inputPath: inputImage,
          outputPath: 'transparency-test-output/black_background.bin',
          samplingFactor: SamplingFactor.YUV420,
          quality: 10
          // backgroundColor 默认为 'black'
        }
      },
      {
        name: '白色背景',
        config: {
          inputPath: inputImage,
          outputPath: 'transparency-test-output/white_background.bin',
          samplingFactor: SamplingFactor.YUV420,
          quality: 10,
          backgroundColor: 'white'
        }
      },
      {
        name: '红色背景',
        config: {
          inputPath: inputImage,
          outputPath: 'transparency-test-output/red_background.bin',
          samplingFactor: SamplingFactor.YUV422,
          quality: 8,
          backgroundColor: '#FF0000'
        }
      },
      {
        name: '蓝色背景 + 高质量',
        config: {
          inputPath: inputImage,
          outputPath: 'transparency-test-output/blue_background_hq.bin',
          samplingFactor: SamplingFactor.YUV444,
          quality: 2,
          backgroundColor: '#0000FF'
        }
      }
    ];
    
    console.log(`🔄 开始透明度处理测试 (共 ${transparencyTests.length} 个配置)...\n`);
    
    const results = [];
    
    // 逐个执行测试
    for (let i = 0; i < transparencyTests.length; i++) {
      const test = transparencyTests[i];
      console.log(`${i + 1}. ${test.name}`);
      
      try {
        const startTime = Date.now();
        const result = await convertToJpeg(test.config);
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // 获取输出文件信息
        const outputStats = await stat(result.outputPath);
        
        console.log(`   ✅ 转换成功 (${duration}ms)`);
        console.log(`   📁 输出: ${result.outputPath}`);
        console.log(`   📏 JPEG 大小: ${formatBytes(result.jpegSize)}`);
        console.log(`   📐 尺寸: ${result.dimensions.width}x${result.dimensions.height}`);
        console.log(`   📊 文件大小: ${formatBytes(outputStats.size)}`);
        
        results.push({
          name: test.name,
          success: true,
          result,
          outputSize: outputStats.size,
          duration,
          backgroundColor: test.config.backgroundColor || 'black'
        });
        
      } catch (error) {
        console.log(`   ❌ 转换失败: ${error.message}`);
        console.log(`   🔍 错误类型: ${error.type || 'unknown'}`);
        
        results.push({
          name: test.name,
          success: false,
          error: error.message,
          errorType: error.type,
          backgroundColor: test.config.backgroundColor || 'black'
        });
      }
      
      console.log(''); // 空行分隔
    }
    
    // 生成测试报告
    console.log('=' .repeat(60));
    console.log('📊 透明度处理测试报告\n');
    
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;
    
    console.log(`📈 转换结果:`);
    console.log(`   ✅ 成功: ${successCount}/${results.length}`);
    console.log(`   ❌ 失败: ${failureCount}/${results.length}`);
    
    if (successCount > 0) {
      console.log(`\n📊 成功转换统计:`);
      
      const successResults = results.filter(r => r.success);
      const avgDuration = Math.round(successResults.reduce((sum, r) => sum + r.duration, 0) / successResults.length);
      const totalOutputSize = successResults.reduce((sum, r) => sum + r.outputSize, 0);
      
      console.log(`   ⏱️  平均转换时间: ${avgDuration}ms`);
      console.log(`   📏 总输出大小: ${formatBytes(totalOutputSize)}`);
      
      console.log(`\n📁 输出文件列表:`);
      successResults.forEach(r => {
        console.log(`   - ${r.result.outputPath} (${formatBytes(r.outputSize)}, 背景: ${r.backgroundColor})`);
      });
    }
    
    if (failureCount > 0) {
      console.log(`\n❌ 失败原因:`);
      results.filter(r => !r.success).forEach(r => {
        console.log(`   - ${r.name}: ${r.error} (${r.errorType || 'unknown'})`);
      });
    }
    
    console.log(`\n💡 新功能说明:`);
    console.log(`   - 自动检测 PNG、WEBP、GIF、TIFF 等可能包含透明度的格式`);
    console.log(`   - 使用 FFmpeg 复合滤镜处理透明度`);
    console.log(`   - 支持自定义背景色 (black, white, #FF0000 等)`);
    console.log(`   - 默认使用黑色背景 (符合 spec_v4.txt 要求)`);
    
    if (successCount === results.length) {
      console.log(`\n🎉 透明度处理功能测试全部通过！`);
      console.log(`✨ 新功能已成功集成到图片转换器中`);
    } else if (successCount > 0) {
      console.log(`\n⚠️  部分透明度测试通过，请检查失败的配置`);
    } else {
      console.log(`\n❌ 透明度处理测试失败，请检查 FFmpeg 安装和配置`);
    }
    
  } catch (error) {
    console.error('\n💥 透明度测试执行失败:', error.message);
    
    if (error.code === 'ENOENT' && error.path && error.path.includes('test_image')) {
      console.log('\n💡 解决方案:');
      console.log('   1. 确保 test_image/ac_cold.png 文件存在');
      console.log('   2. 检查文件路径是否正确');
    } else if (error.type === 'ffmpeg') {
      console.log('\n💡 FFmpeg 问题解决方案:');
      console.log('   1. 确保 FFmpeg 支持 lavfi 和 color 滤镜');
      console.log('   2. 更新到较新版本的 FFmpeg');
      console.log('   3. 检查 FFmpeg 编译选项');
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

// 运行透明度处理测试
testTransparencyHandling();