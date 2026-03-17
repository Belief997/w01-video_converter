/**
 * CLI 工具真实图片测试
 * 
 * 使用命令行界面测试图片转换功能
 */

import { spawn } from 'child_process';
import { stat, readFile } from 'fs/promises';

async function testCLI() {
  console.log('🖥️  CLI 工具真实图片测试\n');
  
  const inputImage = 'test_image/ac_cold.png';
  
  // 检查输入文件
  try {
    const inputStats = await stat(inputImage);
    console.log(`📸 输入图片: ${inputImage} (${formatBytes(inputStats.size)})`);
  } catch (error) {
    console.error(`❌ 输入图片不存在: ${inputImage}`);
    return;
  }
  
  // CLI 测试配置
  const cliTests = [
    {
      name: 'CLI 基本转换',
      args: ['-i', inputImage, '-o', 'converted-images/cli_basic.bin', '-s', '420', '-q', '10']
    },
    {
      name: 'CLI 高质量转换',
      args: ['-i', inputImage, '-o', 'converted-images/cli_high_quality.bin', '-s', '444', '-q', '2']
    },
    {
      name: 'CLI 灰度转换',
      args: ['-i', inputImage, '-o', 'converted-images/cli_grayscale.bin', '-s', '400', '-q', '15']
    },
    {
      name: 'CLI 缩略图',
      args: ['-i', inputImage, '-o', 'converted-images/cli_thumbnail.bin', '-s', '422', '-q', '8', '-r', '50']
    },
    {
      name: 'CLI 压缩版本',
      args: ['-i', inputImage, '-o', 'converted-images/cli_compressed.bin', '-s', '420', '-q', '20', '-c']
    }
  ];
  
  console.log(`🔄 开始 CLI 测试 (共 ${cliTests.length} 个)...\n`);
  
  const results = [];
  
  for (let i = 0; i < cliTests.length; i++) {
    const test = cliTests[i];
    console.log(`${i + 1}. ${test.name}`);
    console.log(`   命令: node image-to-jpeg-converter/dist/cli.js ${test.args.join(' ')}`);
    
    try {
      const startTime = Date.now();
      const success = await runCLI(test.args);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      if (success) {
        // 检查输出文件
        const outputPath = test.args[test.args.indexOf('-o') + 1];
        const outputStats = await stat(outputPath);
        
        console.log(`   ✅ 转换成功 (${duration}ms)`);
        console.log(`   📁 输出: ${outputPath}`);
        console.log(`   📏 文件大小: ${formatBytes(outputStats.size)}`);
        
        results.push({
          name: test.name,
          success: true,
          outputPath,
          outputSize: outputStats.size,
          duration
        });
      } else {
        console.log(`   ❌ 转换失败`);
        results.push({
          name: test.name,
          success: false
        });
      }
      
    } catch (error) {
      console.log(`   ❌ 执行失败: ${error.message}`);
      results.push({
        name: test.name,
        success: false,
        error: error.message
      });
    }
    
    console.log(''); // 空行
  }
  
  // 验证输出文件
  console.log('🔍 验证 CLI 输出文件...\n');
  
  for (const result of results) {
    if (!result.success) continue;
    
    try {
      const buffer = await readFile(result.outputPath);
      console.log(`📄 ${result.outputPath}:`);
      
      // 检查自定义头部
      if (buffer.length >= 16) {
        const headerType = buffer[1];
        const width = buffer.readUInt16LE(2);
        const height = buffer.readUInt16LE(4);
        const jpegSize = buffer.readUInt32LE(8);
        
        console.log(`   ✅ 头部类型: ${headerType} (${headerType === 12 ? 'JPEG' : '异常'})`);
        console.log(`   📐 尺寸: ${width}x${height}`);
        console.log(`   📊 JPEG 大小: ${formatBytes(jpegSize)}`);
        
        // 查找 JPEG 标记
        let jpegFound = false;
        for (let i = 0; i < buffer.length - 1; i++) {
          if (buffer[i] === 0xFF && buffer[i + 1] === 0xD8) {
            console.log(`   ✅ JPEG 数据: 偏移 ${i}`);
            jpegFound = true;
            break;
          }
        }
        
        if (!jpegFound) {
          console.log(`   ❌ 未找到 JPEG 数据`);
        }
        
      } else {
        console.log(`   ❌ 文件太小: ${buffer.length} 字节`);
      }
      
    } catch (error) {
      console.log(`   ❌ 验证失败: ${error.message}`);
    }
    
    console.log('');
  }
  
  // 生成报告
  console.log('=' .repeat(50));
  console.log('📊 CLI 测试报告\n');
  
  const successCount = results.filter(r => r.success).length;
  console.log(`📈 结果: ${successCount}/${results.length} 成功`);
  
  if (successCount > 0) {
    const successResults = results.filter(r => r.success);
    const avgDuration = Math.round(successResults.reduce((sum, r) => sum + r.duration, 0) / successResults.length);
    const totalSize = successResults.reduce((sum, r) => sum + r.outputSize, 0);
    
    console.log(`⏱️  平均转换时间: ${avgDuration}ms`);
    console.log(`📏 总输出大小: ${formatBytes(totalSize)}`);
    
    console.log(`\n📁 CLI 生成的文件:`);
    successResults.forEach(r => {
      console.log(`   - ${r.outputPath} (${formatBytes(r.outputSize)})`);
    });
  }
  
  if (successCount === results.length) {
    console.log(`\n🎉 CLI 工具测试全部通过！`);
  } else {
    console.log(`\n⚠️  部分 CLI 测试失败`);
  }
}

function runCLI(args) {
  return new Promise((resolve) => {
    const child = spawn('node', ['image-to-jpeg-converter/dist/cli.js', ...args], {
      stdio: 'pipe'
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve(true);
      } else {
        console.log(`   ⚠️  CLI 退出码: ${code}`);
        if (stderr) {
          console.log(`   📝 错误输出: ${stderr.trim()}`);
        }
        resolve(false);
      }
    });
    
    child.on('error', (error) => {
      console.log(`   ❌ CLI 执行错误: ${error.message}`);
      resolve(false);
    });
  });
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// 运行 CLI 测试
testCLI();