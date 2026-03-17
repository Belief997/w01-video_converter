/**
 * Spec v4.txt 合规性测试
 * 
 * 验证生成的头部是否严格符合 spec_v4.txt 要求：
 * "gui_rgb_data_head_t 填充 type 、w 和 h，其余为 0"
 */

import { convertToJpeg, SamplingFactor, ResizeOption } from './image-to-jpeg-converter/dist/index.js';
import { readFile, mkdir, stat } from 'fs/promises';

async function testSpecCompliance() {
  console.log('📋 Spec v4.txt 合规性测试\n');
  console.log('=' .repeat(60));
  
  try {
    // 创建测试输出目录
    await mkdir('spec-compliance-test', { recursive: true });
    
    const inputImage = 'test_image/ac_cold.png';
    
    // 检查输入文件
    const inputStats = await stat(inputImage);
    console.log(`📸 输入图片: ${inputImage} (${formatBytes(inputStats.size)})`);
    
    // 测试不同的配置，验证头部都符合规范
    const testConfigs = [
      {
        name: '基本配置（所有可选参数默认）',
        config: {
          inputPath: inputImage,
          outputPath: 'spec-compliance-test/basic.bin',
          samplingFactor: SamplingFactor.YUV420,
          quality: 10
        }
      },
      {
        name: '尝试设置 resize 和 compress（应被忽略）',
        config: {
          inputPath: inputImage,
          outputPath: 'spec-compliance-test/with_flags.bin',
          samplingFactor: SamplingFactor.YUV422,
          quality: 8,
          resize: ResizeOption.Fifty,    // 应被忽略
          compress: true,                // 应被忽略
          version: 5                     // 应被忽略
        }
      },
      {
        name: '高质量配置',
        config: {
          inputPath: inputImage,
          outputPath: 'spec-compliance-test/high_quality.bin',
          samplingFactor: SamplingFactor.YUV444,
          quality: 2,
          backgroundColor: 'white'
        }
      }
    ];
    
    console.log(`🔄 开始合规性测试 (共 ${testConfigs.length} 个配置)...\n`);
    
    const results = [];
    
    // 逐个执行测试
    for (let i = 0; i < testConfigs.length; i++) {
      const test = testConfigs[i];
      console.log(`${i + 1}. ${test.name}`);
      
      try {
        const startTime = Date.now();
        const result = await convertToJpeg(test.config);
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log(`   ✅ 转换成功 (${duration}ms)`);
        console.log(`   📁 输出: ${result.outputPath}`);
        
        // 读取并验证头部
        const buffer = await readFile(result.outputPath);
        const compliance = verifyHeaderCompliance(buffer, result.dimensions);
        
        results.push({
          name: test.name,
          success: true,
          result,
          compliance,
          duration
        });
        
      } catch (error) {
        console.log(`   ❌ 转换失败: ${error.message}`);
        results.push({
          name: test.name,
          success: false,
          error: error.message
        });
      }
      
      console.log(''); // 空行分隔
    }
    
    // 生成合规性报告
    console.log('=' .repeat(60));
    console.log('📊 Spec v4.txt 合规性报告\n');
    
    const successCount = results.filter(r => r.success).length;
    const compliantCount = results.filter(r => r.success && r.compliance.isCompliant).length;
    
    console.log(`📈 转换结果:`);
    console.log(`   ✅ 成功: ${successCount}/${results.length}`);
    console.log(`   📋 符合规范: ${compliantCount}/${successCount}`);
    
    if (successCount > 0) {
      console.log(`\n📋 合规性详情:`);
      
      results.filter(r => r.success).forEach(r => {
        const status = r.compliance.isCompliant ? '✅ 符合' : '❌ 不符合';
        console.log(`   ${status} ${r.name}`);
        
        if (!r.compliance.isCompliant) {
          r.compliance.violations.forEach(violation => {
            console.log(`      - ${violation}`);
          });
        }
      });
    }
    
    console.log(`\n💡 Spec v4.txt 要求:`);
    console.log(`   - gui_rgb_data_head_t 只填充 type、w、h`);
    console.log(`   - 其余所有字段必须为 0`);
    console.log(`   - type = 12 (JPEG)`);
    console.log(`   - w = 图片宽度`);
    console.log(`   - h = 图片高度`);
    
    if (compliantCount === successCount && successCount > 0) {
      console.log(`\n🎉 所有测试都符合 Spec v4.txt 规范！`);
    } else if (compliantCount > 0) {
      console.log(`\n⚠️  部分测试符合规范，请检查不符合的配置`);
    } else {
      console.log(`\n❌ 没有测试符合 Spec v4.txt 规范，需要修复实现`);
    }
    
  } catch (error) {
    console.error('\n💥 合规性测试执行失败:', error.message);
  }
}

/**
 * 验证头部是否符合 spec_v4.txt 规范
 */
function verifyHeaderCompliance(buffer, expectedDimensions) {
  const violations = [];
  let isCompliant = true;
  
  if (buffer.length < 16) {
    violations.push('文件太小，缺少完整头部');
    return { isCompliant: false, violations };
  }
  
  // 解析头部字段
  const byte0 = buffer[0];
  const type = buffer[1];
  const width = buffer.readUInt16LE(2);
  const height = buffer.readUInt16LE(4);
  const version = buffer[6];
  const rsvd2 = buffer[7];
  
  // 解析位字段
  const scan = byte0 & 0x01;
  const align = (byte0 >> 1) & 0x01;
  const resize = (byte0 >> 2) & 0x03;
  const compress = (byte0 >> 4) & 0x01;
  const jpeg = (byte0 >> 5) & 0x01;
  const idu = (byte0 >> 6) & 0x01;
  const rsvd = (byte0 >> 7) & 0x01;
  
  console.log(`   🔍 头部解析:`);
  console.log(`      位字段: scan=${scan}, align=${align}, resize=${resize}, compress=${compress}, jpeg=${jpeg}, idu=${idu}, rsvd=${rsvd}`);
  console.log(`      type=${type}, w=${width}, h=${height}, version=${version}, rsvd2=${rsvd2}`);
  
  // 验证 spec_v4.txt 要求
  
  // 1. type 必须为 12
  if (type !== 12) {
    violations.push(`type 应为 12，实际为 ${type}`);
    isCompliant = false;
  } else {
    console.log(`      ✅ type = 12 (正确)`);
  }
  
  // 2. w 和 h 应该匹配图片尺寸
  if (width !== expectedDimensions.width || height !== expectedDimensions.height) {
    violations.push(`尺寸不匹配：期望 ${expectedDimensions.width}x${expectedDimensions.height}，实际 ${width}x${height}`);
    isCompliant = false;
  } else {
    console.log(`      ✅ w=${width}, h=${height} (正确)`);
  }
  
  // 3. 其余字段必须为 0
  const shouldBeZero = [
    { name: 'scan', value: scan },
    { name: 'align', value: align },
    { name: 'resize', value: resize },
    { name: 'compress', value: compress },
    { name: 'jpeg', value: jpeg },
    { name: 'idu', value: idu },
    { name: 'rsvd', value: rsvd },
    { name: 'version', value: version },
    { name: 'rsvd2', value: rsvd2 }
  ];
  
  shouldBeZero.forEach(field => {
    if (field.value !== 0) {
      violations.push(`${field.name} 应为 0，实际为 ${field.value}`);
      isCompliant = false;
    } else {
      console.log(`      ✅ ${field.name} = 0 (正确)`);
    }
  });
  
  // 4. 验证 JPEG 数据标记
  let jpegOffset = -1;
  for (let i = 0; i < buffer.length - 1; i++) {
    if (buffer[i] === 0xFF && buffer[i + 1] === 0xD8) {
      jpegOffset = i;
      break;
    }
  }
  
  if (jpegOffset !== 16) {
    violations.push(`JPEG 数据应从偏移 16 开始，实际从 ${jpegOffset} 开始`);
    isCompliant = false;
  } else {
    console.log(`      ✅ JPEG 数据从偏移 16 开始 (正确)`);
  }
  
  return { isCompliant, violations };
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// 运行合规性测试
testSpecCompliance();