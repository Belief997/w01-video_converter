/**
 * 简单的源码集成测试用例
 * 
 * 这个测试用例演示如何集成和使用 image-to-jpeg-converter 库
 * 包含基本转换测试和错误处理
 */

import { convertToJpeg, SamplingFactor, ResizeOption } from './dist/index.js';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { join } from 'path';

async function createTestImage() {
  console.log('📸 创建测试图片...');
  
  // 创建一个简单的 PNG 图片 (10x10 像素，红色)
  const pngData = Buffer.from([
    // PNG 文件头
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
    
    // IHDR 块 (图片信息)
    0x00, 0x00, 0x00, 0x0D, // 长度
    0x49, 0x48, 0x44, 0x52, // IHDR
    0x00, 0x00, 0x00, 0x0A, // 宽度 10
    0x00, 0x00, 0x00, 0x0A, // 高度 10
    0x08, 0x02, 0x00, 0x00, 0x00, // 位深度8, RGB, 无压缩
    0x02, 0x50, 0x58, 0x8A, // CRC
    
    // IDAT 块 (图片数据 - 红色像素)
    0x00, 0x00, 0x00, 0x16, // 长度
    0x49, 0x44, 0x41, 0x54, // IDAT
    0x78, 0x9C, 0x63, 0xF8, 0x0F, 0x00, 0x00, 0xFF, 
    0xFF, 0x03, 0x00, 0x00, 0x06, 0x00, 0x05, 0xAC, 
    0x27, 0x56, 0x8A, 0x2C, 0x49, 0x55, // 压缩的红色数据
    
    // IEND 块 (结束)
    0x00, 0x00, 0x00, 0x00, // 长度
    0x49, 0x45, 0x4E, 0x44, // IEND
    0xAE, 0x42, 0x60, 0x82  // CRC
  ]);
  
  await mkdir('test-output', { recursive: true });
  await writeFile('test-input.png', pngData);
  
  console.log('  ✅ 测试图片创建完成 (10x10 红色 PNG)');
}

async function testBasicConversion() {
  console.log('\n🔄 测试基本转换功能...');
  
  try {
    const result = await convertToJpeg({
      inputPath: 'test-input.png',
      outputPath: 'test-output/basic.jpg',
      samplingFactor: SamplingFactor.YUV420,
      quality: 10
    });
    
    console.log('  ✅ 基本转换成功!');
    console.log(`  📁 输出文件: ${result.outputPath}`);
    console.log(`  📏 JPEG 大小: ${result.jpegSize} 字节`);
    console.log(`  📐 图片尺寸: ${result.dimensions.width}x${result.dimensions.height}`);
    
    return true;
  } catch (error) {
    console.error('  ❌ 基本转换失败:', error.message);
    return false;
  }
}

async function testAdvancedOptions() {
  console.log('\n🔧 测试高级选项...');
  
  const tests = [
    {
      name: '高质量 (4:4:4)',
      config: {
        inputPath: 'test-input.png',
        outputPath: 'test-output/high-quality.jpg',
        samplingFactor: SamplingFactor.YUV444,
        quality: 2
      }
    },
    {
      name: '灰度转换',
      config: {
        inputPath: 'test-input.png',
        outputPath: 'test-output/grayscale.jpg',
        samplingFactor: SamplingFactor.Grayscale,
        quality: 15
      }
    },
    {
      name: '缩放到50%',
      config: {
        inputPath: 'test-input.png',
        outputPath: 'test-output/resized.jpg',
        samplingFactor: SamplingFactor.YUV420,
        quality: 10,
        resize: ResizeOption.Fifty
      }
    },
    {
      name: '启用压缩标志',
      config: {
        inputPath: 'test-input.png',
        outputPath: 'test-output/compressed.jpg',
        samplingFactor: SamplingFactor.YUV422,
        quality: 8,
        compress: true
      }
    }
  ];
  
  let successCount = 0;
  
  for (const test of tests) {
    try {
      console.log(`  🧪 ${test.name}...`);
      const result = await convertToJpeg(test.config);
      console.log(`    ✅ 成功 - ${result.jpegSize} 字节`);
      successCount++;
    } catch (error) {
      console.error(`    ❌ 失败: ${error.message}`);
    }
  }
  
  console.log(`  📊 高级选项测试: ${successCount}/${tests.length} 成功`);
  return successCount === tests.length;
}

async function testErrorHandling() {
  console.log('\n🚨 测试错误处理...');
  
  const errorTests = [
    {
      name: '不存在的输入文件',
      config: {
        inputPath: 'non-existent.png',
        outputPath: 'test-output/error1.jpg',
        samplingFactor: SamplingFactor.YUV420,
        quality: 10
      },
      expectedError: 'validation'
    },
    {
      name: '无效的质量值',
      config: {
        inputPath: 'test-input.png',
        outputPath: 'test-output/error2.jpg',
        samplingFactor: SamplingFactor.YUV420,
        quality: 50  // 超出范围 (1-31)
      },
      expectedError: 'validation'
    }
  ];
  
  let errorsCaught = 0;
  
  for (const test of errorTests) {
    try {
      console.log(`  🧪 ${test.name}...`);
      await convertToJpeg(test.config);
      console.log(`    ⚠️  应该失败但成功了`);
    } catch (error) {
      if (error.type === test.expectedError) {
        console.log(`    ✅ 正确捕获 ${error.type} 错误`);
        errorsCaught++;
      } else {
        console.log(`    ❌ 错误类型不匹配: 期望 ${test.expectedError}, 得到 ${error.type}`);
      }
    }
  }
  
  console.log(`  📊 错误处理测试: ${errorsCaught}/${errorTests.length} 正确`);
  return errorsCaught === errorTests.length;
}

async function verifyOutputFiles() {
  console.log('\n🔍 验证输出文件...');
  
  const outputFiles = [
    'test-output/basic.jpg',
    'test-output/high-quality.jpg',
    'test-output/grayscale.jpg',
    'test-output/resized.jpg',
    'test-output/compressed.jpg'
  ];
  
  let validFiles = 0;
  
  for (const file of outputFiles) {
    try {
      const buffer = await readFile(file);
      
      // 检查文件大小
      if (buffer.length === 0) {
        console.log(`  ❌ ${file} 文件为空`);
        continue;
      }
      
      // 检查自定义头部 (前16字节)
      if (buffer.length < 16) {
        console.log(`  ❌ ${file} 文件太小，缺少头部`);
        continue;
      }
      
      // 检查类型字段 (第2个字节应该是12)
      if (buffer[1] === 0x0C) {
        console.log(`  ✅ ${file} 头部类型正确 (JPEG=12)`);
      } else {
        console.log(`  ⚠️  ${file} 头部类型异常: ${buffer[1]}`);
      }
      
      // 查找 JPEG 数据标记 (0xFFD8)
      let jpegFound = false;
      for (let i = 0; i < buffer.length - 1; i++) {
        if (buffer[i] === 0xFF && buffer[i + 1] === 0xD8) {
          console.log(`  ✅ ${file} 包含 JPEG 数据 (偏移 ${i})`);
          jpegFound = true;
          break;
        }
      }
      
      if (!jpegFound) {
        console.log(`  ❌ ${file} 未找到 JPEG 数据标记`);
        continue;
      }
      
      console.log(`  ✅ ${file} 验证通过 (${buffer.length} 字节)`);
      validFiles++;
      
    } catch (error) {
      console.log(`  ❌ ${file} 读取失败: ${error.message}`);
    }
  }
  
  console.log(`  📊 文件验证: ${validFiles}/${outputFiles.length} 有效`);
  return validFiles > 0;
}

async function runSimpleTest() {
  console.log('🧪 图片转 JPEG 转换器 - 简单测试\n');
  console.log('=' .repeat(50));
  
  try {
    // 1. 创建测试图片
    await createTestImage();
    
    // 2. 测试基本转换
    const basicSuccess = await testBasicConversion();
    
    // 3. 测试高级选项
    const advancedSuccess = await testAdvancedOptions();
    
    // 4. 测试错误处理
    const errorSuccess = await testErrorHandling();
    
    // 5. 验证输出文件
    const verifySuccess = await verifyOutputFiles();
    
    // 总结
    console.log('\n' + '=' .repeat(50));
    console.log('📊 测试结果总结:');
    console.log(`  基本转换: ${basicSuccess ? '✅ 通过' : '❌ 失败'}`);
    console.log(`  高级选项: ${advancedSuccess ? '✅ 通过' : '❌ 失败'}`);
    console.log(`  错误处理: ${errorSuccess ? '✅ 通过' : '❌ 失败'}`);
    console.log(`  文件验证: ${verifySuccess ? '✅ 通过' : '❌ 失败'}`);
    
    const allPassed = basicSuccess && advancedSuccess && errorSuccess && verifySuccess;
    
    if (allPassed) {
      console.log('\n🎉 所有测试通过! 库集成成功!');
      console.log('✅ 图片转 JPEG 转换器可以正常使用');
    } else {
      console.log('\n⚠️  部分测试失败，请检查配置');
      console.log('💡 确保 FFmpeg 已安装并在 PATH 中');
    }
    
    console.log('\n📁 输出文件位置: test-output/');
    console.log('🔍 可以检查生成的 JPEG 文件');
    
  } catch (error) {
    console.error('\n💥 测试执行失败:', error.message);
    console.error('🔍 错误详情:', error.stack);
  }
}

// 运行测试
runSimpleTest();